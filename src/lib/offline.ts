import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { create } from "zustand";
import { api, ApiError } from "./api";
import { chaptersToDownload } from "./listening";
import type { Chapter, ChapterAudio, Verse, VerseAudioFile, VersePage } from "./types";

/**
 * Sourates téléchargées pour une lecture sans réseau : texte, traduction, phonétique,
 * minutage des mots (contenu.json) et audio de chaque verset, dans le dossier de l'app.
 */
export type OfflineChapter = {
  version: 1;
  chapterId: number;
  translationId: number | null;
  recitationId: number;
  downloadedAt: string;
  verses: Verse[];
  audio: ChapterAudio;
};

export type OfflineEntry = { chapterId: number; translationId: number | null; recitationId: number; downloadedAt: string; bytes: number };

export const offlineSupported = Platform.OS !== "web";

const PER_PAGE = 50;
const PARALLEL_DOWNLOADS = 4;

const root = () => new Directory(Paths.document, "offline");
const chapterDir = (chapterId: number) => new Directory(root(), String(chapterId));
const contentFile = (chapterId: number) => new File(chapterDir(chapterId), "content.json");
/** Un fichier par verset, ou un seul pour la sourate quand la voix est publiée en piste par sourate. */
export const audioName = (file: Pick<VerseAudioFile, "verseKey" | "endMs">) =>
  file.endMs !== undefined ? "sourate.mp3" : `${file.verseKey.replace(":", "_")}.mp3`;
const audioFile = (chapterId: number, file: VerseAudioFile) => new File(chapterDir(chapterId), audioName(file));
const indexFile = () => new File(root(), "index.json");
const chaptersFile = () => new File(root(), "chapters.json");

type OfflineStore = {
  entries: Record<number, OfflineEntry>;
  /** Progression (0 à 1) des téléchargements en cours. */
  progress: Record<number, number>;
  loaded: boolean;
  load: () => void;
  /** `signal` : annulation entre deux fichiers (la copie partielle est effacée, l'ancienne reste). */
  download: (chapterId: number, translationId: number | null, recitationId: number | null, signal?: AbortSignal) => Promise<void>;
  remove: (chapterId: number) => void;
  removeAll: () => void;
};

/** Erreur levée quand un téléchargement est annulé par l'utilisateur. */
export class DownloadAbortedError extends Error {
  constructor() {
    super("Téléchargement annulé");
    this.name = "DownloadAbortedError";
  }
}
export const isDownloadAborted = (error: unknown) => error instanceof DownloadAbortedError;

function ensureRoot() {
  const dir = root();
  if (!dir.exists) dir.create({ intermediates: true });
}

function saveIndex(entries: Record<number, OfflineEntry>) {
  ensureRoot();
  indexFile().write(JSON.stringify(Object.values(entries)));
}

function directorySize(dir: Directory): number {
  return dir.list().reduce((total, item) => total + (item instanceof File ? (item.size ?? 0) : directorySize(item)), 0);
}

export const useOffline = create<OfflineStore>((set, get) => ({
  entries: {},
  progress: {},
  loaded: false,

  load: () => {
    if (!offlineSupported || get().loaded) return;
    let entries: Record<number, OfflineEntry> = {};
    try {
      const file = indexFile();
      if (file.exists) {
        const list = JSON.parse(file.textSync()) as OfflineEntry[];
        entries = Object.fromEntries(list.filter((e) => contentFile(e.chapterId).exists).map((e) => [e.chapterId, e]));
      }
    } catch {
      entries = {};
    }
    set({ entries, loaded: true });
  },

  download: async (chapterId, translationId, recitationId, signal) => {
    if (!offlineSupported || get().progress[chapterId] !== undefined) return;
    if (signal?.aborted) throw new DownloadAbortedError();
    const setProgress = (value: number) => set((s) => ({ progress: { ...s.progress, [chapterId]: value } }));
    setProgress(0);
    // Téléchargement dans un dossier temporaire : la copie précédente reste intacte en cas d'échec.
    const partial = new Directory(root(), `${chapterId}.partial`);
    try {
      // 1. Texte : toutes les pages de versets, avec la traduction choisie.
      const verses: Verse[] = [];
      for (let page = 1; ; page++) {
        const query = new URLSearchParams({ page: String(page), perPage: String(PER_PAGE) });
        if (translationId) query.set("translationId", String(translationId));
        const result = await api<VersePage>(`/quran/chapters/${chapterId}/verses?${query}`);
        verses.push(...result.verses);
        if (page >= result.pagination.totalPages) break;
      }
      const audio = await api<ChapterAudio>(`/quran/chapters/${chapterId}/audio${recitationId ? `?recitationId=${recitationId}` : ""}`);
      setProgress(0.05);

      // 2. Audio : un fichier par verset (ou la piste de la sourate, une seule fois), quelques
      // téléchargements en parallèle.
      if (partial.exists) partial.delete();
      partial.create({ intermediates: true });
      let done = 0;
      const queue = [...new Map(audio.files.map((f) => [audioName(f), f])).values()];
      const total = queue.length;
      const worker = async () => {
        for (let file = queue.shift(); file; file = queue.shift()) {
          if (signal?.aborted) throw new DownloadAbortedError();
          await File.downloadFileAsync(file.url, new File(partial, audioName(file)), { idempotent: true });
          done++;
          setProgress(0.05 + 0.95 * (done / total));
        }
      };
      await Promise.all(Array.from({ length: PARALLEL_DOWNLOADS }, worker));
      if (signal?.aborted) throw new DownloadAbortedError();

      const content: OfflineChapter = {
        version: 1,
        chapterId,
        translationId,
        recitationId: audio.recitationId,
        downloadedAt: new Date().toISOString(),
        verses,
        audio,
      };
      new File(partial, "content.json").write(JSON.stringify(content));
      const previous = chapterDir(chapterId);
      if (previous.exists) previous.delete();
      partial.rename(String(chapterId));
      const entry: OfflineEntry = {
        chapterId,
        translationId,
        recitationId: audio.recitationId,
        downloadedAt: content.downloadedAt,
        bytes: directorySize(chapterDir(chapterId)),
      };
      const entries = { ...get().entries, [chapterId]: entry };
      saveIndex(entries);
      set({ entries });
    } catch (error) {
      if (partial.exists) partial.delete();
      throw error;
    } finally {
      set((s) => {
        const progress = { ...s.progress };
        delete progress[chapterId];
        return { progress };
      });
    }
  },

  remove: (chapterId) => {
    const dir = chapterDir(chapterId);
    if (dir.exists) dir.delete();
    const entries = { ...get().entries };
    delete entries[chapterId];
    saveIndex(entries);
    set({ entries });
  },

  removeAll: () => {
    for (const entry of Object.values(get().entries)) {
      const dir = chapterDir(entry.chapterId);
      if (dir.exists) dir.delete();
    }
    saveIndex({});
    set({ entries: {} });
  },
}));

export type DownloadAllProgress = { done: number; total: number; chapterId: number };

/**
 * Télécharge tout le Coran, une sourate après l'autre, en sautant celles déjà présentes avec la
 * même traduction et le même récitateur (reprise possible après un arrêt). `onProgress` est appelé
 * avant chaque sourate (`done` compte aussi les sourates sautées) ; `signal` arrête la série entre
 * deux fichiers. Lève `DownloadAbortedError` en cas d'arrêt.
 */
export async function downloadAll({
  chapterIds,
  translationId,
  recitationFor,
  signal,
  onProgress,
}: {
  chapterIds: number[];
  translationId: number | null;
  recitationFor: (chapterId: number) => number | null;
  signal: AbortSignal;
  onProgress: (progress: DownloadAllProgress) => void;
}): Promise<void> {
  const store = useOffline.getState();
  const todo = new Set(chaptersToDownload(chapterIds, Object.values(store.entries), translationId, recitationFor));
  const total = chapterIds.length;
  let done = 0;
  for (const chapterId of chapterIds) {
    if (signal.aborted) throw new DownloadAbortedError();
    onProgress({ done, total, chapterId });
    if (todo.has(chapterId)) await store.download(chapterId, translationId, recitationFor(chapterId), signal);
    done++;
  }
  onProgress({ done, total, chapterId: chapterIds[chapterIds.length - 1] ?? 0 });
}

/** Contenu d'une sourate téléchargée, avec l'audio pointant vers les fichiers locaux. */
export async function readOfflineChapter(chapterId: number): Promise<OfflineChapter | null> {
  if (!offlineSupported) return null;
  const file = contentFile(chapterId);
  if (!file.exists) return null;
  const content = JSON.parse(await file.text()) as OfflineChapter;
  return {
    ...content,
    audio: {
      ...content.audio,
      files: content.audio.files.map((f) => {
        const local = audioFile(chapterId, f);
        return local.exists ? { ...f, url: local.uri } : f;
      }),
    },
  };
}

/** Liste des sourates gardée sur l'appareil, pour naviguer sans réseau. */
export function saveChaptersCache(chapters: Chapter[]) {
  if (!offlineSupported) return;
  try {
    ensureRoot();
    chaptersFile().write(JSON.stringify(chapters));
  } catch {
    // Cache facultatif.
  }
}

export function loadChaptersCache(): Chapter[] | null {
  if (!offlineSupported) return null;
  try {
    const file = chaptersFile();
    return file.exists ? (JSON.parse(file.textSync()) as Chapter[]) : null;
  } catch {
    return null;
  }
}

export const isNetworkError = (error: unknown) => error instanceof ApiError && error.code === "NETWORK_ERROR";

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
