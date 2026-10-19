import type { Label, Segment } from "./types";

/**
 * Explications simples des étiquettes grammaticales du Quranic Arabic Corpus, telles que les
 * renvoie l'API (`Label.code`). Pensées pour quelqu'un qui n'a pas fait de grammaire arabe.
 */

/** Nature d'un morceau de mot (nom, verbe, particule et leurs sous-types). */
export const NATURE_HELP: Record<string, string> = {
  N: "Un nom : il désigne une chose, une personne ou une idée.",
  V: "Un verbe : il exprime une action ou un état.",
  P: "Une particule : un petit mot-outil (et, dans, ne… pas) qui relie ou précise.",
  PN: "Un nom propre : le nom d'une personne ou d'un lieu.",
  PRON: "Un pronom : il remplace un nom (il, elle, eux, vous…).",
  DEM: "Un démonstratif : ce, cette, ceux-là…",
  REL: "Un pronom relatif : qui, que, celui qui…",
  T: "Un adverbe de temps : quand, le jour où…",
  LOC: "Un adverbe de lieu : où, devant, derrière…",
  NV: "Un mot qui a le sens d'un verbe sans se conjuguer.",
  COND: "Un mot de condition : si, quiconque…",
  INTG: "Un mot interrogatif : est-ce que, quoi, qui ?",
  DET: "L'article « al- » : il rend le nom défini (le, la, les).",
  EMPH: "Un lâm d'insistance : il renforce l'affirmation (vraiment, certes).",
  IMPV: "Un lâm qui donne un ordre : que… (qu'ils fassent).",
  PRP: "Un lâm de but : pour que.",
  CONJ: "Une conjonction : elle relie deux mots ou deux phrases (et, puis, ou).",
  SUB: "Elle introduit une proposition : que, le fait que.",
  ACC: "Elle met le mot suivant à l'accusatif et insiste (inna, anna…).",
  AMD: "Une rectification : mais, cependant (lâkin).",
  ANS: "Une réponse : oui, certes.",
  AVR: "Une dissuasion : non, pas du tout (kallâ).",
  CAUS: "Une cause : parce que, afin que.",
  CERT: "Une certitude : certes, déjà (qad).",
  CIRC: "Elle introduit une circonstance : alors que, tandis que.",
  COM: "Un accompagnement : avec.",
  EQ: "Une équivalence : que ce soit… ou.",
  EXH: "Une exhortation : allons, pourquoi ne pas…",
  EXL: "Un détail : quant à (ammâ).",
  EXP: "Une exception : sauf, excepté (illâ).",
  FUT: "Elle marque le futur : sa-, sawfa.",
  INC: "Elle ouvre la phrase (inna en tête de phrase).",
  INT: "Une explication : c'est-à-dire.",
  NEG: "Une négation : ne… pas.",
  PREV: "Elle empêche la particule d'agir (le « mâ » de innamâ).",
  PRO: "Une interdiction : ne fais pas.",
  REM: "Une reprise du récit : puis, et.",
  RES: "Une restriction : seulement, ne… que.",
  RET: "Une rétractation : bien plutôt (bal).",
  RSLT: "Elle introduit la conséquence d'une condition : alors.",
  SUP: "Un mot ajouté pour le rythme ou l'insistance, sans sens propre.",
  SUR: "Une surprise : voilà que, soudain.",
  VOC: "Un appel : ô !",
  ATT: "Elle attire l'attention : voici (hâ).",
  DIST: "Elle marque l'éloignement dans « cela » (le « li » de dhâlika).",
  ADDR: "Elle désigne la personne à qui l'on parle (le « ka » de dhâlika).",
  INL: "Les lettres isolées qui ouvrent certaines sourates (Alif Lâm Mîm…), dont le sens exact n'est connu que de Dieu.",
};

/** Traits d'un mot : cas, temps, mode, voix, dérivation. */
export const FEATURE_HELP: Record<string, string> = {
  NOM: "Nominatif : le cas du sujet. Se reconnaît à la damma (-ou) ou au tanwîn -oun.",
  ACC: "Accusatif : le cas du complément d'objet et de l'état. Se reconnaît à la fatḥa (-a) ou au tanwîn -an.",
  GEN: "Génitif : le cas après une préposition ou après un autre nom (« le livre DE… »). Se reconnaît à la kasra (-i) ou au tanwîn -in.",
  INDEF: "Indéfini : sans article (un, une, des), souvent avec tanwîn.",
  ADJ: "Adjectif : il qualifie le nom qui précède et s'accorde avec lui.",
  ACT_PCPL: "Participe actif : celui qui fait l'action (celui qui croit, le croyant).",
  PASS_PCPL: "Participe passif : ce qui subit l'action (écrit, béni).",
  VN: "Nom verbal (maṣdar) : l'action elle-même (le fait de croire, la foi).",
  PASS: "Voix passive : le sujet subit l'action (il a été créé).",
  PERF: "Accompli : action terminée, le plus souvent le passé (il a dit).",
  IMPF: "Inaccompli : action en cours ou à venir (il dit, il dira).",
  IMPV: "Impératif : un ordre (dis !).",
  "MOOD:IND": "Indicatif : la forme ordinaire du verbe au présent.",
  "MOOD:SUBJ": "Subjonctif : après « pour que » (li-, kay) ou « ne… jamais » (lan).",
  "MOOD:JUS": "Apocopé : après « ne… pas » (lam), dans les ordres indirects ou les conditions.",
};

const PERSON: Record<string, string> = { "1": "celui qui parle", "2": "celui à qui l'on parle", "3": "celui dont on parle" };
const PRONOUNS: Record<string, string> = {
  "1S": "je / moi",
  "1P": "nous",
  "1D": "nous deux",
  "2MS": "tu / toi (homme)",
  "2FS": "tu / toi (femme)",
  "2MD": "vous deux",
  "2FD": "vous deux (femmes)",
  "2D": "vous deux",
  "2MP": "vous (hommes)",
  "2FP": "vous (femmes)",
  "2P": "vous",
  "3MS": "il / lui",
  "3FS": "elle",
  "3MD": "eux deux",
  "3FD": "elles deux",
  "3D": "eux deux",
  "3MP": "ils / eux",
  "3FP": "elles",
  "3P": "ils / eux",
};
const GENDER: Record<string, string> = { M: "masculin", F: "féminin" };
const NUMBER: Record<string, string> = { S: "singulier", D: "duel (deux)", P: "pluriel" };

/** Explication d'un code personne / genre / nombre (« 3MP », « FS », « P »), ou null. */
export function explainPersonGenderNumber(code: string): string | null {
  const match = /^([123])?([MF])?([SDP])?$/.exec(code);
  if (!match || code === "") return null;
  const [, person, gender, number] = match;
  const pronoun = PRONOUNS[code];
  const parts = [person && PERSON[person], gender && GENDER[gender], number && NUMBER[number]].filter((p): p is string => Boolean(p));
  if (pronoun) return `${pronoun} (${parts.join(", ")})`;
  return parts.join(", ");
}

/** Définition simple d'une étiquette, selon qu'elle décrit la nature du morceau ou un trait. */
export function explainLabel(label: Label, kind: "nature" | "feature"): string | null {
  if (kind === "nature") return NATURE_HELP[label.code] ?? null;
  if (label.code.startsWith("VF:")) return "Forme du verbe : schéma de construction qui nuance le sens de la racine (intensif, réciproque, demander à…).";
  if (label.code.startsWith("FAM:")) return "Famille de mots qui modifient la phrase qu'ils introduisent (cas des mots suivants).";
  return FEATURE_HELP[label.code] ?? explainPersonGenderNumber(label.code);
}

const POSITION_INTRO: Record<Segment["position"], string> = {
  prefix: "Petit mot collé au début",
  stem: "Cœur du mot",
  suffix: "Petit mot collé à la fin",
};

/**
 * Une phrase en clair pour un morceau de mot : « Petit mot collé au début : une conjonction, elle
 * relie… » ; « Cœur du mot : un nom, au génitif… ».
 */
export function explainSegment(segment: Segment): string {
  const nature = segment.category ?? segment.partOfSpeech;
  const natureHelp = NATURE_HELP[nature.code];
  const pronoun = segment.features.map((f) => PRONOUNS[f.code]).find(Boolean);
  const intro = POSITION_INTRO[segment.position];
  let sentence = natureHelp ? `${intro}, ${natureHelp.charAt(0).toLowerCase()}${natureHelp.slice(1)}` : `${intro}, ${nature.fr.toLowerCase()}.`;
  if (pronoun && (nature.code === "PRON" || segment.position === "suffix")) sentence += ` Ici : « ${pronoun} ».`;
  else if (pronoun && segment.partOfSpeech.code === "V") sentence += ` Sujet : « ${pronoun} ».`;
  return sentence;
}

/** Aide sur la racine et le lemme, affichée sous ces deux lignes. */
export const ROOT_HELP = "La racine, ce sont les lettres de base communes à toute une famille de mots : k-t-b donne écrire, livre, écrivain…";
export const LEMMA_HELP = "Le lemme est la forme de base du mot, celle que l'on chercherait dans un dictionnaire.";

/** Phrase d'introduction de la carte grammaticale. */
export const SEGMENTS_INTRO =
  "Un mot du Coran peut contenir plusieurs morceaux : des petits mots collés au début (et, dans, le…), le cœur du mot, et des pronoms collés à la fin (lui, eux, vous…).";
