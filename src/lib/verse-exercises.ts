import { shuffle, type Random } from "./shuffle";

/**
 * Logique pure des exercices d'écriture et de recomposition (mémorisation et lexique) :
 * mélange déterministe des tuiles, découpe des longs versets, trous à compléter et lettres
 * d'un mot. Aucun rendu ici : les composants `VerseOrderExercise`, `FillVerseExercise` et
 * `ComposeWordExercise` consomment ces fonctions, les tests les couvrent.
 */

/** Mot d'un verset tel que les exercices en ont besoin (sous-ensemble de `Word` de l'API, redéclaré ici). */
export type ExerciseWord = {
  location: string;
  position: number;
  type: string;
  textUthmani: string;
  audioUrl: string | null;
};

/** Tuile à toucher : `id` la distingue d'une autre tuile au même texte (lettres ou mots répétés). */
export type Tile = { id: number; text: string };

/** Un trou du verset : position du mot caché, bonne réponse et propositions (bonne réponse incluse). */
export type Blank = { index: number; answer: string; options: string[] };

/** Au-delà de ce nombre de mots, le verset est recomposé en plusieurs parties. */
export const MAX_SEGMENT_WORDS = 12;
/** Propositions par trou : la bonne réponse et deux autres mots. */
export const FILL_OPTIONS = 3;
/** Enfant : on ne complète que les versets courts. */
export const KIDS_MAX_FILL_WORDS = 8;
/** Case vide d'un mot ou d'une lettre à placer. */
export const SLOT = "▢";

/** Signes à retirer pour obtenir les lettres isolées : voyelles brèves et tanwîn (ً à ْ), alif suscrit (ٰ), tatwîl (ـ). */
const DIACRITICS = /[ً-ْٰـ]/gu;

/** Le texte sans ses voyelles ni signes : « كِتَابٌ » → « كتاب ». */
export function stripDiacritics(text: string): string {
  return text.replace(DIACRITICS, "");
}

/** Les mots d'un verset, sans le numéro de fin ni les marques (`type !== "word"`). */
export function verseWords<T extends { type: string }>(words: readonly T[]): T[] {
  return words.filter((w) => w.type === "word");
}

/**
 * Découpe un long verset en parties de taille voisine (≤ `max` mots chacune), pour qu'aucune ne
 * soit un bout d'un ou deux mots : 13 mots → 7 + 6, 30 mots → 10 + 10 + 10.
 */
export function segmentWords<T>(words: readonly T[], max = MAX_SEGMENT_WORDS): T[][] {
  if (words.length === 0) return [];
  if (words.length <= max) return [[...words]];
  const count = Math.ceil(words.length / max);
  const size = Math.ceil(words.length / count);
  const out: T[][] = [];
  for (let i = 0; i < words.length; i += size) out.push(words.slice(i, i + size));
  return out;
}

/**
 * Tuiles mélangées (Fisher-Yates via `shuffle`) à partir des textes dans l'ordre. L'identifiant
 * est la position d'origine. Si le mélange rend l'ordre initial (deux ou trois tuiles), on
 * décale d'un cran : l'exercice ne doit jamais être déjà résolu.
 */
export function orderTiles(texts: readonly string[], random: Random = Math.random): Tile[] {
  const tiles = texts.map((text, id) => ({ id, text }));
  if (new Set(texts).size < 2) return tiles;
  const mixed = shuffle(tiles, random);
  const solved = mixed.every((t, i) => t.text === texts[i]);
  return solved ? [...mixed.slice(1), mixed[0]!] : mixed;
}

/** Nombre d'erreurs en toutes lettres : « sans erreur », « 1 erreur », « 3 erreurs ». */
export function errorsLabel(errors: number): string {
  if (errors <= 0) return "sans erreur";
  return `${errors} erreur${errors > 1 ? "s" : ""}`;
}

/** Longueur maximale d'un mot à composer lettre par lettre (au-delà, le jeu devient fastidieux). */
const MAX_COMPOSE_LETTERS = 10;

/**
 * Les lettres d'un mot du lexique, en formes isolées (`Array.from` sur le texte sans signes),
 * pour le jeu « Composer le mot ». Une entrée à plusieurs formes (« أين / أينما ») ne garde que
 * la première ; les espaces sont ignorés. Null si le mot a moins de deux lettres ou plus de dix.
 */
export function composeLetters(ar: string | null | undefined): string[] | null {
  const form = (ar ?? "").split(/[/،,]/)[0] ?? "";
  const letters = Array.from(stripDiacritics(form)).filter((c) => /\S/u.test(c));
  if (letters.length < 2 || letters.length > MAX_COMPOSE_LETTERS) return null;
  return letters;
}

/** Nombre de trous selon la longueur du verset : 1 jusqu'à 3 mots, 2 jusqu'à 7, 3 au-delà (toujours un mot visible). */
export function blankCount(wordCount: number): number {
  if (wordCount < 2) return 0;
  const wanted = wordCount <= 3 ? 1 : wordCount <= 7 ? 2 : 3;
  return Math.min(wanted, wordCount - 1);
}

/** Tire `count` positions distinctes, en évitant deux trous voisins tant que c'est possible. */
function pickBlankIndices(wordCount: number, count: number, random: Random): number[] {
  const order = shuffle(Array.from({ length: wordCount }, (_, i) => i), random);
  const chosen: number[] = [];
  for (const i of order) {
    if (chosen.length === count) break;
    if (!chosen.some((c) => Math.abs(c - i) === 1)) chosen.push(i);
  }
  for (const i of order) {
    if (chosen.length === count) break;
    if (!chosen.includes(i)) chosen.push(i);
  }
  return chosen.sort((a, b) => a - b);
}

/**
 * Construit les trous du jeu « Compléter le verset » : `count` mots cachés (par défaut selon la
 * longueur), chacun avec trois propositions : le bon mot et deux mots différents du même verset,
 * complétés au besoin par des mots d'un verset voisin (`neighbours`). Deux mots qui ne diffèrent
 * que par leurs signes comptent pour le même. Moins de trois propositions si rien d'autre n'existe.
 */
export function fillBlanks(words: readonly string[], neighbours: readonly string[] = [], random: Random = Math.random, count = blankCount(words.length)): Blank[] {
  const total = Math.min(Math.max(count, 0), Math.max(words.length - 1, 0));
  if (total === 0) return [];
  return pickBlankIndices(words.length, total, random).map((index) => {
    const answer = words[index]!;
    const seen = new Set([stripDiacritics(answer)]);
    const distinct = (candidates: readonly string[]) =>
      shuffle(candidates, random).filter((text) => {
        const bare = stripDiacritics(text);
        if (!bare || seen.has(bare)) return false;
        seen.add(bare);
        return true;
      });
    const sameVerse = distinct(words.filter((_, i) => i !== index));
    const distractors = sameVerse.slice(0, FILL_OPTIONS - 1);
    if (distractors.length < FILL_OPTIONS - 1) distractors.push(...distinct(neighbours).slice(0, FILL_OPTIONS - 1 - distractors.length));
    return { index, answer, options: shuffle([answer, ...distractors], random) };
  });
}

/**
 * Faut-il proposer « Compléter le verset » ? Enfant : seulement un verset court (≤ 8 mots), à
 * chaque séance. Adulte : à partir de la deuxième séance sur le verset ou s'il est à réviser.
 */
export function offerFill({ kids, wordCount, review }: { kids: boolean; wordCount: number; review: boolean }): boolean {
  if (wordCount < 2) return false;
  return kids ? wordCount <= KIDS_MAX_FILL_WORDS : review;
}

/** Verset voisin dont les mots servent de distracteurs : le suivant, sinon le précédent, sinon aucun. */
export function neighbourVerseKey(chapterId: number, verseNumber: number, versesCount: number | undefined): string | null {
  if (versesCount === undefined || versesCount < 2) return null;
  if (verseNumber < versesCount) return `${chapterId}:${verseNumber + 1}`;
  return `${chapterId}:${verseNumber - 1}`;
}
