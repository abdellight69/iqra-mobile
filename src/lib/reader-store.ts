import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";
import { CHAPTER_COUNT, isSleepTimerMinutes, sleepEndsAt } from "./listening";

/** Réglages du lecteur conservés d'une lecture à l'autre (SecureStore ; localStorage sur le web). */
const KEY = "iqra.reader";
const isWeb = Platform.OS === "web";

type ReaderSettings = {
  showTranslation: boolean;
  showTransliteration: boolean;
  showWordByWord: boolean;
  showKnownWords: boolean;
  showTajweed: boolean;
  arabicSize: number;
  /** Enchaîner la sourate suivante à la fin de la récitation. */
  continuousPlayback: boolean;
  /** Récitateur choisi pour une sourate donnée (sinon celui des réglages). */
  recitationBySurah: Record<number, number>;
  /** Minuteur de sommeil choisi (0 : aucun) et son échéance en ms ; valables pour la session seulement. */
  sleepTimerMinutes: number;
  sleepEndsAt: number | null;
  toggleTranslation: () => void;
  toggleTransliteration: () => void;
  toggleWordByWord: () => void;
  toggleKnownWords: () => void;
  toggleTajweed: () => void;
  setArabicSize: (size: number) => void;
  toggleContinuousPlayback: () => void;
  setSurahRecitation: (chapterId: number, recitationId: number | null) => void;
  setSleepTimerMinutes: (minutes: number) => void;
};

export const ARABIC_SIZES = [24, 28, 32, 36, 42] as const;

type Persisted = Pick<
  ReaderSettings,
  "showTranslation" | "showTransliteration" | "showWordByWord" | "showKnownWords" | "showTajweed" | "arabicSize" | "continuousPlayback" | "recitationBySurah"
>;

const DEFAULTS: Persisted = {
  showTranslation: true,
  showTransliteration: true,
  showWordByWord: false,
  showKnownWords: false,
  showTajweed: false,
  arabicSize: 32,
  continuousPlayback: false,
  recitationBySurah: {},
};

/** Récitateurs par sourate : clés 1 à 114, valeurs entières positives ; le reste est ignoré. */
export function sanitizeRecitationBySurah(raw: unknown): Record<number, number> {
  const out: Record<number, number> = {};
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return out;
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const chapterId = Number(key);
    if (!Number.isInteger(chapterId) || chapterId < 1 || chapterId > CHAPTER_COUNT) continue;
    if (typeof value !== "number" || !Number.isInteger(value) || value <= 0) continue;
    out[chapterId] = value;
  }
  return out;
}

/** Ne garde que les réglages, avec des valeurs du bon type (un enregistrement ancien ou altéré est ignoré champ par champ). */
export function sanitizeReaderSettings(raw: unknown): Partial<Persisted> {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const out: Partial<Persisted> = {};
  for (const key of ["showTranslation", "showTransliteration", "showWordByWord", "showKnownWords", "showTajweed", "continuousPlayback"] as const) {
    if (typeof input[key] === "boolean") out[key] = input[key];
  }
  if (typeof input.arabicSize === "number" && (ARABIC_SIZES as readonly number[]).includes(input.arabicSize)) out.arabicSize = input.arabicSize;
  if (input.recitationBySurah !== undefined) out.recitationBySurah = sanitizeRecitationBySurah(input.recitationBySurah);
  return out;
}

async function loadSettings(): Promise<Partial<Persisted>> {
  try {
    const raw = isWeb ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return raw ? sanitizeReaderSettings(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

async function saveSettings(settings: Persisted): Promise<void> {
  const json = JSON.stringify(settings);
  try {
    if (isWeb) globalThis.localStorage?.setItem(KEY, json);
    else await SecureStore.setItemAsync(KEY, json);
  } catch {
    // Stockage indisponible : les réglages restent valables pour la session en cours.
  }
}

const pick = (s: ReaderSettings): Persisted => ({
  showTranslation: s.showTranslation,
  showTransliteration: s.showTransliteration,
  showWordByWord: s.showWordByWord,
  showKnownWords: s.showKnownWords,
  showTajweed: s.showTajweed,
  arabicSize: s.arabicSize,
  continuousPlayback: s.continuousPlayback,
  recitationBySurah: s.recitationBySurah,
});

export const useReaderSettings = create<ReaderSettings>((set) => ({
  ...DEFAULTS,
  sleepTimerMinutes: 0,
  sleepEndsAt: null,
  toggleTranslation: () => set((s) => ({ showTranslation: !s.showTranslation })),
  toggleTransliteration: () => set((s) => ({ showTransliteration: !s.showTransliteration })),
  toggleWordByWord: () => set((s) => ({ showWordByWord: !s.showWordByWord })),
  toggleKnownWords: () => set((s) => ({ showKnownWords: !s.showKnownWords })),
  toggleTajweed: () => set((s) => ({ showTajweed: !s.showTajweed })),
  setArabicSize: (arabicSize) => set({ arabicSize }),
  toggleContinuousPlayback: () => set((s) => ({ continuousPlayback: !s.continuousPlayback })),
  setSurahRecitation: (chapterId, recitationId) =>
    set((s) => {
      const recitationBySurah = { ...s.recitationBySurah };
      if (recitationId === null) delete recitationBySurah[chapterId];
      else recitationBySurah[chapterId] = recitationId;
      return { recitationBySurah };
    }),
  // L'échéance est fixée au moment du choix ; un choix invalide revient à « aucun ».
  setSleepTimerMinutes: (minutes) => {
    const value = isSleepTimerMinutes(minutes) ? minutes : 0;
    set({ sleepTimerMinutes: value, sleepEndsAt: sleepEndsAt(value, Date.now()) });
  },
}));

// Relecture des réglages au chargement, puis sauvegarde à chaque changement (après la relecture,
// pour ne pas écraser l'enregistrement avec les valeurs par défaut).
void loadSettings().then((saved) => {
  if (Object.keys(saved).length > 0) useReaderSettings.setState(saved);
  let last = JSON.stringify(pick(useReaderSettings.getState()));
  useReaderSettings.subscribe((state) => {
    const next = pick(state);
    const json = JSON.stringify(next);
    if (json === last) return;
    last = json;
    void saveSettings(next);
  });
});
