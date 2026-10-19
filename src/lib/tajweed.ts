/**
 * Règles de tajwid balisées par la Quran Foundation API (champ text_uthmani_tajweed),
 * avec leur nom usuel, une courte définition et une couleur (claire / sombre).
 * Durées des prolongations (madd) : comme dans la légende du tajwid de Quran.com.
 * Une règle absente de cette liste est affichée sans couleur.
 * Contraste : chaque couleur atteint au moins 4.5:1 sur le fond et les surfaces de son thème
 * (vérifié par src/lib/__tests__/contrast.test.ts).
 */
export type TajweedRule = {
  name: string;
  description: string;
  /** En clair : ce qu'il faut faire avec la voix, pour quelqu'un qui découvre le tajwid. */
  how: string;
  light: string;
  dark: string;
};

export const TAJWEED_RULES: Record<string, TajweedRule> = {
  ham_wasl: { name: "Hamzat al-wasl", description: "Hamza de liaison : non prononcée quand on enchaîne avec le mot précédent.", how: "Si vous enchaînez depuis le mot précédent, ne prononcez pas ce « a » de départ : glissez directement sur la lettre suivante. En début de lecture, prononcez-le normalement.", light: "#716D64", dark: "#9A988F" },
  laam_shamsiyah: { name: "Lâm solaire", description: "Le lâm de l’article n’est pas prononcé : la lettre suivante est doublée.", how: "Le « l » de « al- » se tait : prononcez la lettre d'après deux fois, comme dans « ar-raḥmân » (et non « al-raḥmân »).", light: "#716D64", dark: "#9A988F" },
  slnt: { name: "Lettre muette", description: "Lettre écrite mais non prononcée.", how: "Cette lettre est écrite mais ne se dit pas : passez dessus comme si elle n'existait pas.", light: "#716D64", dark: "#9A988F" },
  madda_normal: { name: "Madd naturel", description: "Prolongation de 2 temps.", how: "Allongez la voyelle sur deux temps, environ le temps de dire « un, deux » à voix normale.", light: "#2D63BF", dark: "#B4CCF6" },
  madda_permissible: { name: "Madd permis", description: "Prolongation de 2, 4 ou 6 temps.", how: "Allongez la voyelle plus longtemps : 2, 4 ou 6 temps au choix, mais gardez la même durée tout au long de votre lecture.", light: "#2550B0", dark: "#9AB6F1" },
  madda_obligatory: { name: "Madd obligatoire", description: "Prolongation de 4 ou 5 temps.", how: "Allongez nettement la voyelle, 4 à 5 temps : c'est obligatoire parce qu'une hamza suit dans le même mot.", light: "#1E3C9C", dark: "#86A3EA" },
  madda_necessary: { name: "Madd nécessaire", description: "Prolongation de 6 temps.", how: "Allongement le plus long : 6 temps, environ trois fois une voyelle ordinaire, parce qu'une lettre doublée ou sans voyelle suit.", light: "#122A85", dark: "#7390E4" },
  qalaqah: { name: "Qalqala", description: "Léger rebond sur ق ط ب ج د lorsqu’elles sont sans voyelle.", how: "Faites « rebondir » la lettre : un petit écho sec, sans ajouter de voyelle, comme un « b » ou un « d » qui claque.", light: "#C02A22", dark: "#F07067" },
  ghunnah: { name: "Ghunna", description: "Nasalisation de 2 temps (nûn ou mîm doublé).", how: "Faites passer le son par le nez pendant deux temps, comme le « n » prolongé de « bonbon » : c'est la ghunna.", light: "#9E5406", dark: "#F2A050" },
  ikhafa: { name: "Ikhfâ’", description: "Nûn sans voyelle ou tanwîn dissimulé, avec nasalisation.", how: "Ne prononcez ni franchement le « n » ni rien du tout : un son nasal léger, bouche déjà préparée pour la lettre suivante, pendant deux temps.", light: "#8E3FB0", dark: "#C08AE0" },
  ikhafa_shafawi: { name: "Ikhfâ’ labial", description: "Mîm sans voyelle devant bâ’ : dissimulé, avec nasalisation.", how: "Lèvres presque fermées sur le « m », laissez un son nasal de deux temps avant le « b ».", light: "#B0358E", dark: "#E886CC" },
  iqlab: { name: "Iqlâb", description: "Nûn sans voyelle ou tanwîn devant bâ’ : prononcé comme un mîm.", how: "Remplacez le « n » par un « m » léger, lèvres légèrement fermées, avec un son nasal de deux temps devant le « b ».", light: "#0D688E", dark: "#5CC4EC" },
  idgham_ghunnah: { name: "Idghâm avec ghunna", description: "Fusion dans ي ن م و, avec nasalisation.", how: "Le « n » disparaît dans la lettre suivante, qui se prononce doublée, avec un son nasal de deux temps.", light: "#11705A", dark: "#4FC3A2" },
  idgham_wo_ghunnah: { name: "Idghâm sans ghunna", description: "Fusion dans ل ou ر, sans nasalisation.", how: "Le « n » disparaît dans le « l » ou le « r » suivant, prononcé doublé, sans son nasal.", light: "#2E6F17", dark: "#7CC458" },
  idgham_shafawi: { name: "Idghâm labial", description: "Mîm sans voyelle fusionné dans le mîm suivant.", how: "Les deux « m » se fondent en un seul « m » doublé, avec un son nasal de deux temps.", light: "#4B7010", dark: "#9ACD5E" },
  idgham_mutajanisayn: { name: "Idghâm de lettres apparentées", description: "Fusion de deux lettres de même point d’articulation.", how: "Les deux lettres, prononcées au même endroit de la bouche, se fondent : on n'entend que la seconde, doublée.", light: "#6A6A6A", dark: "#A8A8A8" },
  idgham_mutaqaribayn: { name: "Idghâm de lettres proches", description: "Fusion de deux lettres de points d’articulation voisins.", how: "Deux lettres proches se fondent : on n'entend que la seconde, doublée.", light: "#6A6A6A", dark: "#A8A8A8" },
};

/** Termes du tajwid expliqués simplement, pour les mots que tout le monde ne connaît pas. */
export const TAJWEED_GLOSSARY: { term: string; definition: string }[] = [
  { term: "Temps (ḥaraka)", definition: "Unité de durée du tajwid : le temps de prononcer une voyelle brève, à peu près le temps de dire « un » à voix normale." },
  { term: "Ghunna", definition: "Son nasal, qui passe par le nez : celui du « n » prolongé dans « bonbon ». Il accompagne le nûn et le mîm dans plusieurs règles et dure deux temps." },
  { term: "Madd", definition: "Allongement d'une voyelle (â, î, oû). Sa durée va de 2 à 6 temps selon la règle." },
  { term: "Idghâm", definition: "Fusion : une lettre disparaît dans la suivante, qui se prononce alors doublée." },
  { term: "Ikhfâ’", definition: "Dissimulation : le nûn ne se prononce ni clairement ni pas du tout, mais comme un son nasal léger." },
  { term: "Iqlâb", definition: "Transformation : le nûn se prononce comme un mîm léger devant la lettre bâ’." },
  { term: "Qalqala", definition: "Rebond : les lettres ق ط ب ج د, sans voyelle, se prononcent avec un petit écho sec." },
  { term: "Tanwîn", definition: "Les doubles voyelles de fin de mot (-an, -in, -oun) : elles se terminent par un son « n » et suivent les mêmes règles que le nûn sans voyelle." },
  { term: "Soukoûn", definition: "Petit rond au-dessus d'une lettre : elle se prononce sans voyelle." },
  { term: "Shadda", definition: "Petit « w » au-dessus d'une lettre : elle se prononce doublée." },
  { term: "Hamza", definition: "Petit coup de glotte, comme l'arrêt dans « euh-oh ». La hamza de liaison (wasl) ne se prononce que si l'on commence la lecture sur elle." },
];

export function tajweedColor(rule: string | null, dark: boolean): string | undefined {
  const known = rule ? TAJWEED_RULES[rule] : undefined;
  return known ? (dark ? known.dark : known.light) : undefined;
}
