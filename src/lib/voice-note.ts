import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
  type RecordingOptions,
} from "expo-audio";
import { Directory, File, Paths } from "expo-file-system";
import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { api, API_URL, errorMessage } from "./api";
import { claimPlayback, PLAYBACK_MODE, releasePlayback } from "./audio";
import { useAuth } from "./auth-store";

/** Le serveur accepte 90 secondes et 1,5 Mo : en AAC mono à 64 kbit/s, 90 s font environ 700 Ko. */
export const MAX_VOICE_NOTE_SECONDS = 90;
const MIN_VOICE_NOTE_MS = 1000;
const RECORDING: RecordingOptions = { ...RecordingPresets.HIGH_QUALITY, numberOfChannels: 1, bitRate: 64000 };

export type VoiceNote = { id: string; durationMs: number };
export type VoiceRecorderState = { phase: "idle" } | { phase: "recording" } | { phase: "uploading" } | { phase: "error"; message: string };

const CACHE_DIR = () => new Directory(Paths.cache, "voice-notes");

/** Les vocaux ne changent jamais : on les garde dans le cache de l'app, sous leur identifiant. */
function cachedFile(id: string): File {
  const dir = CACHE_DIR();
  if (!dir.exists) dir.create({ intermediates: true });
  return new File(dir, `${id}.m4a`);
}

/** Vide les vocaux gardés sur l'appareil (déconnexion, changement de profil ou de compte). */
export function clearVoiceNoteCache() {
  if (Platform.OS === "web") return;
  try {
    const dir = CACHE_DIR();
    if (dir.exists) dir.delete();
  } catch {
    // Cache facultatif : une suppression ratée n'empêche rien.
  }
}

/** Adresse lisible par le lecteur : fichier du cache, téléchargé avec la session du profil au besoin. */
async function playableUri(id: string): Promise<string> {
  const url = `${API_URL}/api/v1/me/missions/audio/${id}`;
  const authorization = () => ({ Authorization: `Bearer ${useAuth.getState().tokens?.accessToken ?? ""}` });
  if (Platform.OS === "web") {
    const response = await fetch(url, { headers: authorization() });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return URL.createObjectURL(await response.blob());
  }
  const file = cachedFile(id);
  if (file.exists) return file.uri;
  try {
    await File.downloadFileAsync(url, file, { headers: authorization(), idempotent: true });
  } catch {
    // Jeton expiré : une requête ordinaire le renouvelle, puis on réessaie une fois.
    await api("/me");
    await File.downloadFileAsync(url, file, { headers: authorization(), idempotent: true });
  }
  return file.uri;
}

/**
 * Enregistre un message vocal du parent puis l'envoie au serveur. Sur téléphone, l'enregistrement
 * est rangé dans le cache sous son identifiant : le réécouter ne demande pas de le retélécharger.
 */
export function useVoiceRecorder(onRecorded: (note: VoiceNote) => void) {
  const recorder = useAudioRecorder(RECORDING);
  const recorderState = useAudioRecorderState(recorder, 250);
  const [state, setState] = useState<VoiceRecorderState>({ phase: "idle" });
  const recording = useRef(false);
  const durationMs = useRef(0);
  durationMs.current = recorderState.durationMillis;
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearLimit = () => {
    if (limit.current) clearTimeout(limit.current);
    limit.current = null;
  };

  async function start() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setState({ phase: "error", message: "L’accès au micro est refusé. Autorisez-le dans les réglages du téléphone pour Eqra." });
        return;
      }
      await setAudioModeAsync({ ...PLAYBACK_MODE, allowsRecording: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      recording.current = true;
      limit.current = setTimeout(() => void stop(), MAX_VOICE_NOTE_SECONDS * 1000);
      setState({ phase: "recording" });
    } catch {
      setState({ phase: "error", message: "Impossible de démarrer l’enregistrement." });
    }
  }

  async function stop() {
    if (!recording.current) return;
    recording.current = false;
    clearLimit();
    const length = Math.min(durationMs.current, MAX_VOICE_NOTE_SECONDS * 1000);
    setState({ phase: "uploading" });
    try {
      try {
        await recorder.stop();
      } finally {
        await setAudioModeAsync(PLAYBACK_MODE).catch(() => undefined);
      }
      const uri = recorder.uri;
      if (!uri) throw new Error("empty");
      if (length < MIN_VOICE_NOTE_MS) {
        discardFile(uri);
        setState({ phase: "error", message: "Message trop court : maintenez l’enregistrement au moins une seconde." });
        return;
      }
      const raw = await readFile(uri);
      const note = await api<VoiceNote>(`/me/missions/audio?durationMs=${Math.max(MIN_VOICE_NOTE_MS, Math.round(length))}`, { method: "POST", raw });
      if (Platform.OS !== "web") await new File(uri).move(cachedFile(note.id)).catch(() => discardFile(uri));
      setState({ phase: "idle" });
      onRecorded(note);
    } catch (error) {
      setState({ phase: "error", message: error instanceof Error && error.message === "empty" ? "L’enregistrement est vide." : errorMessage(error) });
    }
  }

  // Écran quitté pendant l'enregistrement : micro relâché, mode lecture rétabli, fichier supprimé.
  useEffect(
    () => () => {
      clearLimit();
      if (!recording.current) return;
      recording.current = false;
      void setAudioModeAsync(PLAYBACK_MODE).catch(() => undefined);
      void (async () => {
        try {
          const uri = recorder.uri;
          await recorder.stop().catch(() => undefined);
          if (uri) discardFile(uri);
        } catch {
          // Le recorder est déjà libéré : rien à nettoyer.
        }
      })();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return { state, seconds: Math.floor(recorderState.durationMillis / 1000), start, stop };
}

async function readFile(uri: string): Promise<{ data: ArrayBuffer | Blob; contentType: string }> {
  if (Platform.OS === "web") {
    const blob = await (await fetch(uri)).blob();
    return { data: blob, contentType: blob.type.split(";")[0] || "audio/webm" };
  }
  // Préréglage HIGH_QUALITY : AAC dans un conteneur MPEG-4 (.m4a) sur iOS comme sur Android.
  return { data: await new File(uri).arrayBuffer(), contentType: "audio/mp4" };
}

function discardFile(uri: string) {
  if (Platform.OS === "web") return;
  const file = new File(uri);
  if (file.exists) file.delete();
}

/** Lecteur des vocaux d'un parent : un seul à la fois, téléchargé et gardé en cache au premier appui. */
export function useVoiceNotePlayer() {
  const player = useAudioPlayer(null);
  const status = useAudioPlayerStatus(player);
  const [current, setCurrent] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [owner] = useState(() => Symbol("voice-note"));
  useEffect(() => () => releasePlayback(owner), [owner]);
  const claim = () =>
    claimPlayback(owner, () => {
      try {
        player.pause();
      } catch {
        // Lecteur déjà libéré.
      }
    });

  async function toggle(id: string) {
    setError(null);
    if (current === id && status.playing) {
      player.pause();
      return;
    }
    if (current === id) {
      // Même vocal, en pause ou fini : on le reprend du début s'il est allé au bout.
      if (status.didJustFinish || (status.duration > 0 && status.currentTime >= status.duration - 0.1)) await player.seekTo(0);
      claim();
      player.play();
      return;
    }
    setLoading(id);
    try {
      const uri = await playableUri(id);
      claim();
      player.replace({ uri });
      setCurrent(id);
      player.play();
    } catch {
      setError("Impossible de lire ce message vocal. Vérifiez votre connexion.");
    } finally {
      setLoading(null);
    }
  }

  return { playingId: status.playing ? current : null, loadingId: loading, error, toggle };
}
