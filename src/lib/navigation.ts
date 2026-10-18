import { router } from "expo-router";
import type { Word } from "./types";

/** Ouvre la fiche d'un mot du Coran (phonétique, traduction, analyse). */
export function openWordSheet(word: Word) {
  router.push({
    pathname: "/word/[location]",
    params: {
      location: word.location,
      text: word.textUthmani,
      transliteration: word.transliteration ?? "",
      translation: word.translation ?? "",
      language: word.translationLanguage ?? "",
      audio: word.audioUrl ?? "",
      tajweed: [...new Set((word.tajweed ?? []).map((s) => s.rule).filter((r): r is string => Boolean(r)))].join(","),
    },
  });
}
