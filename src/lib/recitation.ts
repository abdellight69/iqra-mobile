import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import { File } from "expo-file-system";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { api, errorMessage } from "./api";
import { PLAYBACK_MODE } from "./audio";
import type { RecitationCheck } from "./types";

/** Le serveur accepte 3 Mo : 5 minutes en AAC mono 64 kbit/s en font environ 2,4. */
export const MAX_RECORDING_SECONDS = 120;
export const MAX_PASSAGE_SECONDS = 300;
const RECORDING: RecordingOptions = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 };
/** Réglage audio de l'application (voir app/_layout.tsx), rétabli après l'enregistrement. */

export type RecitationState =
  | { phase: "idle" }
  | { phase: "recording" }
  | { phase: "checking" }
  | { phase: "done"; result: RecitationCheck }
  | { phase: "error"; message: string };

/** Lit l'enregistrement terminé ; sur téléphone, le fichier est supprimé aussitôt lu. */
async function readRecording(uri: string): Promise<{ data: ArrayBuffer | Blob; contentType: string }> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    return { data: blob, contentType: blob.type.split(";")[0] || "audio/webm" };
  }
  const file = new File(uri);
  try {
    // Préréglage HIGH_QUALITY : AAC dans un conteneur MPEG-4 (.m4a) sur iOS comme sur Android.
    return { data: await file.arrayBuffer(), contentType: "audio/mp4" };
  } finally {
    if (file.exists) file.delete();
  }
}

/** Un verset, ou un passage de versets consécutifs d'une même sourate. */
export type RecitationTarget = { verseKey: string } | { from: string; to: string };

/** Enregistre la récitation d'un verset (ou d'un passage) puis la fait vérifier par le serveur. */
export function useRecitationCheck(target: RecitationTarget, onResult?: (result: RecitationCheck) => void, maxSeconds = MAX_RECORDING_SECONDS) {
  const query = "verseKey" in target ? `verseKey=${encodeURIComponent(target.verseKey)}` : `from=${encodeURIComponent(target.from)}&to=${encodeURIComponent(target.to)}`;
  const client = useQueryClient();
  const recorder = useAudioRecorder(RECORDING);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [state, setState] = useState<RecitationState>({ phase: "idle" });
  const recording = useRef(false);
  // Durée maximale atteinte : on arrête et on vérifie ce qui a été enregistré.
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearLimit = () => {
    if (limit.current) clearTimeout(limit.current);
    limit.current = null;
  };

  async function start() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setState({ phase: "error", message: "L’accès au micro est refusé. Autorisez-le dans les réglages du téléphone pour Iqra (ou Expo Go)." });
        return;
      }
      await setAudioModeAsync({ ...PLAYBACK_MODE, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recording.current = true;
      limit.current = setTimeout(() => void stopAndCheck(), maxSeconds * 1000);
      setState({ phase: "recording" });
    } catch {
      setState({ phase: "error", message: "Impossible de démarrer l’enregistrement." });
    }
  }

  async function stopAndCheck() {
    if (!recording.current) return;
    recording.current = false;
    clearLimit();
    setState({ phase: "checking" });
    try {
      try {
        await recorder.stop();
      } finally {
        // Même si l'arrêt échoue : sinon le son resterait dans l'écouteur (mode enregistrement).
        await setAudioModeAsync(PLAYBACK_MODE).catch(() => undefined);
      }
      if (!recorder.uri) throw new Error("no recording");
      const raw = await readRecording(recorder.uri);
      const result = await api<RecitationCheck>(`/recitation/check?${query}`, { method: "POST", raw });
      setState({ phase: "done", result });
      onResult?.(result);
      // Les mots oubliés (ou retrouvés) changent la liste des mots à retravailler.
      void client.invalidateQueries({ queryKey: ["weak-words"] });
    } catch (error) {
      setState({ phase: "error", message: error instanceof Error && error.message === "no recording" ? "L’enregistrement est vide." : errorMessage(error) });
    }
  }

  async function cancel() {
    if (recording.current) {
      recording.current = false;
      clearLimit();
      await recorder.stop().catch(() => undefined);
      await setAudioModeAsync(PLAYBACK_MODE).catch(() => undefined);
      if (recorder.uri && Platform.OS !== "web") {
        const file = new File(recorder.uri);
        if (file.exists) file.delete();
      }
    }
    setState({ phase: "idle" });
  }

  // Écran quitté pendant l'enregistrement : le micro est relâché, le mode lecture rétabli et
  // l'enregistrement inachevé supprimé de l'appareil.
  useEffect(
    () => () => {
      clearLimit();
      if (!recording.current) return;
      recording.current = false;
      void setAudioModeAsync(PLAYBACK_MODE).catch(() => undefined);
      // Le recorder peut déjà être libéré : toute erreur est ignorée.
      void (async () => {
        try {
          const uri = recorder.uri;
          await recorder.stop().catch(() => undefined);
          if (!uri || Platform.OS === "web") return;
          const file = new File(uri);
          if (file.exists) file.delete();
        } catch {
          // Rien à nettoyer.
        }
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { state, seconds: Math.floor(recorderState.durationMillis / 1000), start, stopAndCheck, cancel };
}
