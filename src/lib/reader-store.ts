import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

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
  toggleTranslation: () => void;
  toggleTransliteration: () => void;
  toggleWordByWord: () => void;
  toggleKnownWords: () => void;
  toggleTajweed: () => void;
  setArabicSize: (size: number) => void;
};

export const ARABIC_SIZES = [24, 28, 32, 36, 42] as const;

type Persisted = Pick<ReaderSettings, "showTranslation" | "showTransliteration" | "showWordByWord" | "showKnownWords" | "showTajweed" | "arabicSize">;

const DEFAULTS: Persisted = {
  showTranslation: true,
  showTransliteration: true,
  showWordByWord: false,
  showKnownWords: false,
  showTajweed: false,
  arabicSize: 32,
};

/** Ne garde que les réglages, avec des valeurs du bon type (un enregistrement ancien ou altéré est ignoré champ par champ). */
export function sanitizeReaderSettings(raw: unknown): Partial<Persisted> {
  if (!raw || typeof raw !== "object") return {};
  const input = raw as Record<string, unknown>;
  const out: Partial<Persisted> = {};
  for (const key of ["showTranslation", "showTransliteration", "showWordByWord", "showKnownWords", "showTajweed"] as const) {
    if (typeof input[key] === "boolean") out[key] = input[key];
  }
  if (typeof input.arabicSize === "number" && (ARABIC_SIZES as readonly number[]).includes(input.arabicSize)) out.arabicSize = input.arabicSize;
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
});

export const useReaderSettings = create<ReaderSettings>((set) => ({
  ...DEFAULTS,
  toggleTranslation: () => set((s) => ({ showTranslation: !s.showTranslation })),
  toggleTransliteration: () => set((s) => ({ showTransliteration: !s.showTransliteration })),
  toggleWordByWord: () => set((s) => ({ showWordByWord: !s.showWordByWord })),
  toggleKnownWords: () => set((s) => ({ showKnownWords: !s.showKnownWords })),
  toggleTajweed: () => set((s) => ({ showTajweed: !s.showTajweed })),
  setArabicSize: (arabicSize) => set({ arabicSize }),
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
