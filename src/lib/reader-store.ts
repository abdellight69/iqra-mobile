import { create } from "zustand";

type ReaderSettings = {
  showTranslation: boolean;
  showWordByWord: boolean;
  arabicSize: number;
  toggleTranslation: () => void;
  toggleWordByWord: () => void;
  setArabicSize: (size: number) => void;
};

export const ARABIC_SIZES = [24, 28, 32, 36, 42] as const;

export const useReaderSettings = create<ReaderSettings>((set) => ({
  showTranslation: true,
  showWordByWord: false,
  arabicSize: 32,
  toggleTranslation: () => set((s) => ({ showTranslation: !s.showTranslation })),
  toggleWordByWord: () => set((s) => ({ showWordByWord: !s.showWordByWord })),
  setArabicSize: (arabicSize) => set({ arabicSize }),
}));
