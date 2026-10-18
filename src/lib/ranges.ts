import type { Chapter, VerseRange } from "./types";

/** « An-Naas 1–6 · Al-Falaq 1–3 » : plages de versets lisibles. */
export function describeRanges(ranges: VerseRange[], chapters: Chapter[] | undefined): string {
  return ranges
    .map((r) => {
      const name = chapters?.find((c) => c.id === r.chapterId)?.nameSimple ?? `Sourate ${r.chapterId}`;
      return r.fromVerse === r.toVerse ? `${name} ${r.fromVerse}` : `${name} ${r.fromVerse}–${r.toVerse}`;
    })
    .join(" · ");
}

/** Clés « sourate:verset » de toutes les plages, dans l'ordre. */
export function rangeKeys(ranges: VerseRange[]): string[] {
  return ranges.flatMap((r) => Array.from({ length: r.toVerse - r.fromVerse + 1 }, (_, i) => `${r.chapterId}:${r.fromVerse + i}`));
}
