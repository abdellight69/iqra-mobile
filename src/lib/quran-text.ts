import type { Verse } from "./types";

/** Basmala en écriture uthmanie, telle que dans le texte Tanzil (1:1). */
export const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

/** Les sourates commencent par la basmala, sauf At-Tawba (9) ; pour Al-Fatiha (1), elle est le premier verset. */
export function showsBasmala(chapterId: number): boolean {
  return chapterId !== 1 && chapterId !== 9;
}

/**
 * Phonétique d'un verset : la translittération du verset publiée par Quran.com, sinon
 * la suite des translittérations mot à mot (même source) si chaque mot en a une.
 */
export function verseTransliteration(verse: Verse): string | null {
  if (verse.transliteration?.text) return verse.transliteration.text;
  const words = verse.words.filter((w) => w.type === "word");
  if (words.length === 0 || words.some((w) => !w.transliteration)) return null;
  return words.map((w) => w.transliteration).join(" ");
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Numéro de verset en chiffres arabes orientaux, comme dans le mushaf. */
export function toArabicDigits(value: number): string {
  return String(value).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)] ?? d);
}
