import { create } from "zustand";

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

export const useReaderSettings = create<ReaderSettings>((set) => ({
  showTranslation: true,
  showTransliteration: true,
  showWordByWord: false,
  showKnownWords: false,
  showTajweed: false,
  arabicSize: 32,
  toggleTranslation: () => set((s) => ({ showTranslation: !s.showTranslation })),
  toggleTransliteration: () => set((s) => ({ showTransliteration: !s.showTransliteration })),
  toggleWordByWord: () => set((s) => ({ showWordByWord: !s.showWordByWord })),
  toggleKnownWords: () => set((s) => ({ showKnownWords: !s.showKnownWords })),
  toggleTajweed: () => set((s) => ({ showTajweed: !s.showTajweed })),
  setArabicSize: (arabicSize) => set({ arabicSize }),
}));
