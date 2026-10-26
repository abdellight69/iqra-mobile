import type { Recitation } from "./types";

/** Titres des deux groupes de voix, dans l'ordre d'affichage. */
export const RECITATION_GROUPS = [
  { key: "words", title: "Mot par mot", detail: "Le mot récité est surligné pendant la lecture." },
  { key: "plain", title: "Sans le mot par mot", detail: "Le verset est suivi, mais pas chaque mot." },
] as const;

export type RecitationGroup = (typeof RECITATION_GROUPS)[number] & { recitations: Recitation[] };

/**
 * Voix séparées selon que la Quran Foundation fournit, pour toutes les sourates, le minutage de
 * chaque mot (surlignage mot par mot) ou non. Un groupe vide n'est pas renvoyé ; l'ordre est gardé.
 */
export function groupRecitations(recitations: readonly Recitation[]): RecitationGroup[] {
  return RECITATION_GROUPS.map((group) => ({
    ...group,
    recitations: recitations.filter((r) => (group.key === "words") === (r.wordByWord !== false)),
  })).filter((group) => group.recitations.length > 0);
}
