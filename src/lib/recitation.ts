import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import { File } from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { api, errorMessage } from "./api";
import type { RecitationCheck } from "./types";

/** Le serveur accepte 3 Mo : 2 minutes en AAC mono 64 kbit/s en font moins d'un. */
export const MAX_RECORDING_SECONDS = 120;
const RECORDING: RecordingOptions = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 };
/** Réglage audio de l'application (voir app/_layout.tsx), rétabli après l'enregistrement. */
const PLAYBACK_MODE = { playsInSilentMode: true, shouldPlayInBackground: true, allowsRecording: false };

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

/** Enregistre la récitation d'un verset puis la fait vérifier par le serveur. */
export function useRecitationCheck(verseKey: string, onResult?: (result: RecitationCheck) => void) {
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
      limit.current = setTimeout(() => void stopAndCheck(), MAX_RECORDING_SECONDS * 1000);
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
      await recorder.stop();
      await setAudioModeAsync(PLAYBACK_MODE).catch(() => undefined);
      if (!recorder.uri) throw new Error("no recording");
      const raw = await readRecording(recorder.uri);
      const result = await api<RecitationCheck>(`/recitation/check?verseKey=${encodeURIComponent(verseKey)}`, { method: "POST", raw });
      setState({ phase: "done", result });
      onResult?.(result);
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

  // Écran quitté pendant l'enregistrement : le micro est relâché et le mode lecture rétabli.
  useEffect(
    () => () => {
      clearLimit();
      if (recording.current) void setAudioModeAsync(PLAYBACK_MODE).catch(() => undefined);
    },
    [],
  );

  return { state, seconds: Math.floor(recorderState.durationMillis / 1000), start, stopAndCheck, cancel };
}
