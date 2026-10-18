/**
 * Règles de tajwid balisées par la Quran Foundation API (champ text_uthmani_tajweed),
 * avec leur nom usuel, une courte définition et une couleur (claire / sombre).
 * Durées des prolongations (madd) : comme dans la légende du tajwid de Quran.com.
 * Une règle absente de cette liste est affichée sans couleur.
 */
export type TajweedRule = { name: string; description: string; light: string; dark: string };

export const TAJWEED_RULES: Record<string, TajweedRule> = {
  ham_wasl: { name: "Hamzat al-wasl", description: "Hamza de liaison : non prononcée quand on enchaîne avec le mot précédent.", light: "#9A9890", dark: "#8A8880" },
  laam_shamsiyah: { name: "Lâm solaire", description: "Le lâm de l’article n’est pas prononcé : la lettre suivante est doublée.", light: "#9A9890", dark: "#8A8880" },
  slnt: { name: "Lettre muette", description: "Lettre écrite mais non prononcée.", light: "#9A9890", dark: "#8A8880" },
  madda_normal: { name: "Madd naturel", description: "Prolongation de 2 temps.", light: "#3B78D8", dark: "#7FA8F0" },
  madda_permissible: { name: "Madd permis", description: "Prolongation de 2, 4 ou 6 temps.", light: "#2F5EC4", dark: "#6C93E8" },
  madda_obligatory: { name: "Madd obligatoire", description: "Prolongation de 4 ou 5 temps.", light: "#2342A8", dark: "#5A7EDC" },
  madda_necessary: { name: "Madd nécessaire", description: "Prolongation de 6 temps.", light: "#122A85", dark: "#4A68C8" },
  qalaqah: { name: "Qalqala", description: "Léger rebond sur ق ط ب ج د lorsqu’elles sont sans voyelle.", light: "#D0342C", dark: "#F07067" },
  ghunnah: { name: "Ghunna", description: "Nasalisation de 2 temps (nûn ou mîm doublé).", light: "#DD7A16", dark: "#F2A050" },
  ikhafa: { name: "Ikhfâ’", description: "Nûn sans voyelle ou tanwîn dissimulé, avec nasalisation.", light: "#8E3FB0", dark: "#C08AE0" },
  ikhafa_shafawi: { name: "Ikhfâ’ labial", description: "Mîm sans voyelle devant bâ’ : dissimulé, avec nasalisation.", light: "#C2409E", dark: "#E886CC" },
  iqlab: { name: "Iqlâb", description: "Nûn sans voyelle ou tanwîn devant bâ’ : prononcé comme un mîm.", light: "#1797C9", dark: "#5CC4EC" },
  idgham_ghunnah: { name: "Idghâm avec ghunna", description: "Fusion dans ي ن م و, avec nasalisation.", light: "#16876A", dark: "#4FC3A2" },
  idgham_wo_ghunnah: { name: "Idghâm sans ghunna", description: "Fusion dans ل ou ر, sans nasalisation.", light: "#3E8A1F", dark: "#7CC458" },
  idgham_shafawi: { name: "Idghâm labial", description: "Mîm sans voyelle fusionné dans le mîm suivant.", light: "#5E9E22", dark: "#9ACD5E" },
  idgham_mutajanisayn: { name: "Idghâm de lettres apparentées", description: "Fusion de deux lettres de même point d’articulation.", light: "#7D7D7D", dark: "#A8A8A8" },
  idgham_mutaqaribayn: { name: "Idghâm de lettres proches", description: "Fusion de deux lettres de points d’articulation voisins.", light: "#7D7D7D", dark: "#A8A8A8" },
};

export function tajweedColor(rule: string | null, dark: boolean): string | undefined {
  const known = rule ? TAJWEED_RULES[rule] : undefined;
  return known ? (dark ? known.dark : known.light) : undefined;
}
