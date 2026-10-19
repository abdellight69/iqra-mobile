import { router, type Href } from "expo-router";
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

/**
 * Ferme l'écran courant (modale, séance). Après un rechargement du bundle ou un lancement par
 * lien profond, l'écran peut être la première route de la pile : `router.back()` n'aurait rien
 * à dépiler et l'écran resterait affiché. On remplace alors la route par l'écran d'origine.
 */
export function closeScreen(fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
