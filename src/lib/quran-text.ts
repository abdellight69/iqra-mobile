/** Basmala en écriture uthmanie, telle que dans le texte Tanzil (1:1). */
export const BASMALA = "بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ";

/** Les sourates commencent par la basmala, sauf At-Tawba (9) ; pour Al-Fatiha (1), elle est le premier verset. */
export function showsBasmala(chapterId: number): boolean {
  return chapterId !== 1 && chapterId !== 9;
}

const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** Numéro de verset en chiffres arabes orientaux, comme dans le mushaf. */
export function toArabicDigits(value: number): string {
  return String(value).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)] ?? d);
}
