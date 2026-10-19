import { shuffle, type Random } from "./shuffle";
import type { Choice, Exercise, LearningSession, VocabWord } from "./types";

/**
 * Petits jeux ajoutés côté app à la séance reçue de l'API. Chaque jeu donne une réponse
 * (mot, juste ou faux) envoyée comme les autres à POST /vocabulary/sessions : la planification
 * SM-2 et l'XP restent celles du serveur.
 */
export type GameExercise =
  /** On entend le mot (audio Quran.com), on choisit son sens. */
  | { type: "listen"; wordId: string; choices: Choice[]; answerId: string }
  /** On entend le mot, on choisit sa forme écrite parmi quatre. */
  | { type: "listen_ar"; wordId: string; choices: Choice[]; answerId: string }
  /** Le mot avec une lettre effacée : laquelle manque ? */
  | { type: "missing_letter"; wordId: string; masked: string; answer: string; choices: string[] }
  /** Un sens proposé pour le mot : vrai ou faux ? */
  | { type: "true_false"; wordId: string; proposed: string; isTrue: boolean }
  /** Retrouver le mot dans le verset où il apparaît. */
  | { type: "in_verse"; wordId: string };

export type SessionExercise = Exercise | GameExercise;

export const GAME_TYPES = ["listen", "missing_letter", "listen_ar", "true_false", "in_verse"] as const;
export type GameType = (typeof GAME_TYPES)[number];

export function isGame(exercise: SessionExercise): exercise is GameExercise {
  return (GAME_TYPES as readonly string[]).includes(exercise.type);
}

/** Case vide à la place de la lettre effacée (caractère neutre : les lettres voisines se détachent). */
export const BLANK = "□";

const ALPHABET = [..."ابتثجحخدذرزسشصضطظعغفقكلمنهوي"];
/** Lettres qui se ressemblent : des distracteurs plausibles. */
const LOOKALIKES = ["بتثني", "جحخ", "دذ", "رز", "سش", "صض", "طظ", "عغ", "فق", "كل", "هةم", "وؤ", "أإاآ"];
const BASE_LETTER = /[ء-غف-ي]/u;

/** Lettre de base suivie de ses signes. */
function clusters(text: string): string[] {
  const out: string[] = [];
  for (const char of text) {
    if (out.length > 0 && /\p{M}/u.test(char)) out[out.length - 1] += char;
    else out.push(char);
  }
  return out;
}

/**
 * Efface une lettre (jamais la première, plus facile à deviner) du premier mot de l'entrée et
 * propose quatre lettres, dont des lettres voisines de forme. Null si le mot est trop court.
 */
export function missingLetter(headword: string, random: Random = Math.random): { masked: string; answer: string; choices: string[] } | null {
  const word = headword.split(/[\s/،,]+/)[0] ?? "";
  const parts = clusters(word);
  const candidates = parts.map((c, i) => i).filter((i) => i > 0 && BASE_LETTER.test(parts[i]![0]!));
  if (candidates.length === 0) return null;
  const index = candidates[Math.floor(random() * candidates.length)]!;
  const answer = parts[index]![0]!;
  const masked = parts.map((c, i) => (i === index ? BLANK : c)).join("");
  const similar = shuffle([...(LOOKALIKES.find((g) => g.includes(answer)) ?? "")].filter((l) => l !== answer), random);
  const others = shuffle(ALPHABET.filter((l) => l !== answer && !similar.includes(l)), random);
  const choices = shuffle([answer, ...similar, ...others].slice(0, 4), random);
  return { masked, answer, choices };
}

type MultipleChoice = Extract<Exercise, { choices: Choice[] }>;
type Plan = { words: Map<string, VocabWord>; meaningChoices: Map<string, MultipleChoice>; formChoices: Map<string, MultipleChoice>; random: Random };

function makeGame(kind: GameType, wordId: string, plan: Plan): GameExercise | null {
  const word = plan.words.get(wordId);
  if (!word) return null;
  switch (kind) {
    case "listen": {
      const source = plan.meaningChoices.get(wordId);
      return source ? { type: "listen", wordId, choices: shuffle(source.choices, plan.random), answerId: source.answerId } : null;
    }
    case "listen_ar": {
      const source = plan.formChoices.get(wordId);
      return source ? { type: "listen_ar", wordId, choices: shuffle(source.choices, plan.random), answerId: source.answerId } : null;
    }
    case "missing_letter": {
      const puzzle = word.headword ? missingLetter(word.headword, plan.random) : null;
      return puzzle ? { type: "missing_letter", wordId, ...puzzle } : null;
    }
    case "true_false": {
      if (!word.fr) return null;
      const source = plan.meaningChoices.get(wordId);
      const distractors = source?.choices.filter((c) => c.id !== source.answerId) ?? [];
      const isTrue = distractors.length === 0 || plan.random() < 0.5;
      const proposed = isTrue ? word.fr : distractors[Math.floor(plan.random() * distractors.length)]!.text;
      return { type: "true_false", wordId, proposed, isTrue };
    }
    case "in_verse":
      return { type: "in_verse", wordId };
  }
}

/** Un jeu par mot, en tournant sur les types ; si un type n'est pas possible pour ce mot, le suivant. */
function pickGame(wordId: string, plan: Plan, counter: { value: number }): GameExercise | null {
  for (let i = 0; i < GAME_TYPES.length; i++) {
    const kind = GAME_TYPES[counter.value % GAME_TYPES.length]!;
    counter.value++;
    const game = makeGame(kind, wordId, plan);
    if (game) return game;
  }
  return null;
}

/**
 * Séance enrichie :
 * - leçon ou sélection de mots : après chaque groupe (présentations, sens, association), un jeu
 *   par mot du groupe, dans un ordre mélangé ; la phase finale « forme arabe » est inchangée ;
 * - révision : une question sur trois devient un jeu (même mot, même nombre de questions).
 */
export function planSession(session: Pick<LearningSession, "kind" | "words" | "exercises">, random: Random = Math.random): SessionExercise[] {
  const plan: Plan = { words: new Map(session.words.map((w) => [w.id, w])), meaningChoices: new Map(), formChoices: new Map(), random };
  for (const exercise of session.exercises) {
    if (exercise.type === "ar_to_fr") plan.meaningChoices.set(exercise.wordId, exercise);
    if (exercise.type === "fr_to_ar") plan.formChoices.set(exercise.wordId, exercise);
  }
  const counter = { value: 0 };

  if (session.kind === "review") {
    return session.exercises.map((exercise, i) => {
      if (i % 3 !== 2 || exercise.type === "intro" || exercise.type === "match") return exercise;
      return pickGame(exercise.wordId, plan, counter) ?? exercise;
    });
  }

  const result: SessionExercise[] = [];
  let chunk: string[] = [];
  const flush = () => {
    const games = chunk.map((wordId) => pickGame(wordId, plan, counter)).filter((g): g is GameExercise => g !== null);
    result.push(...shuffle(games, random));
    chunk = [];
  };
  for (const [i, exercise] of session.exercises.entries()) {
    if (exercise.type === "intro") {
      if (session.exercises[i - 1]?.type !== "intro") flush();
      chunk.push(exercise.wordId);
    } else if (exercise.type === "fr_to_ar") {
      flush();
    }
    result.push(exercise);
  }
  flush();
  return result;
}
