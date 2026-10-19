import { BLANK, GAME_TYPES, isGame, missingLetter, planSession, type SessionExercise } from "../exercises";
import type { Exercise, VocabWord } from "../types";

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function word(id: string, ar: string, fr: string): VocabWord {
  return { id, lessonId: "p23", ar, arNote: null, fr, headword: ar, groupTitleFr: null, groupTitleAr: null, sideLabel: null, occurrences: null, verb: null, isPatternRow: false, sourceUncertain: false };
}

const WORDS = [word("p23-01", "هَذَا", "Ceci"), word("p23-02", "هَذِهِ", "Cette"), word("p23-03", "هَؤُلَاءِ", "Ceux-ci"), word("p23-04", "ذَلِكَ", "Cela"), word("p23-05", "تِلْكَ", "Celle-là")];

function choices(type: "ar_to_fr" | "fr_to_ar", w: VocabWord): Exercise {
  const text = (x: VocabWord) => (type === "ar_to_fr" ? x.fr! : x.headword!);
  return { type, wordId: w.id, answerId: w.id, choices: WORDS.map((x) => ({ id: x.id, text: text(x) })).slice(0, 4) };
}

/** Même composition que le serveur : groupes de 4 (présentations, sens, association), puis formes arabes. */
function lessonExercises(words: VocabWord[]): Exercise[] {
  const out: Exercise[] = [];
  for (let i = 0; i < words.length; i += 4) {
    const chunk = words.slice(i, i + 4);
    for (const w of chunk) out.push({ type: "intro", wordId: w.id });
    for (const w of chunk) out.push(choices("ar_to_fr", w));
    if (chunk.length >= 3) out.push({ type: "match", wordIds: chunk.map((w) => w.id) });
  }
  for (const w of words) out.push(choices("fr_to_ar", w));
  return out;
}

describe("missingLetter", () => {
  it("efface une lettre (jamais la première) et propose quatre lettres dont la bonne", () => {
    const puzzle = missingLetter("كِتَابٌ", seeded(3))!;
    expect(puzzle.masked).toContain(BLANK);
    expect(puzzle.masked.startsWith("كِ")).toBe(true);
    expect("كتاب").toContain(puzzle.answer);
    expect(puzzle.choices).toHaveLength(4);
    expect(new Set(puzzle.choices).size).toBe(4);
    expect(puzzle.choices).toContain(puzzle.answer);
  });

  it("ne garde que le premier mot d'une entrée à plusieurs formes", () => {
    const puzzle = missingLetter("أيْنَ / أَيْنَمَا", seeded(1))!;
    expect(puzzle.masked).not.toContain("/");
  });

  it("renvoie null pour une lettre seule", () => {
    expect(missingLetter("و", seeded(1))).toBeNull();
  });
});

describe("planSession : leçon", () => {
  const session = { kind: "lesson" as const, words: WORDS, exercises: lessonExercises(WORDS) };
  const planned = planSession(session, seeded(42));

  it("garde tous les exercices du serveur dans l'ordre", () => {
    expect(planned.filter((e) => !isGame(e))).toEqual(session.exercises);
  });

  it("ajoute un jeu par mot, placé après l'association de son groupe et avant les formes arabes", () => {
    const games = planned.filter(isGame);
    expect(games.map((g) => g.wordId).sort()).toEqual(WORDS.map((w) => w.id).sort());
    const firstMatch = planned.findIndex((e) => e.type === "match");
    const firstForm = planned.findIndex((e) => e.type === "fr_to_ar");
    const firstChunkGames = planned.slice(firstMatch + 1, firstMatch + 5);
    expect(firstChunkGames.every(isGame)).toBe(true);
    expect(planned.slice(firstForm).some(isGame)).toBe(false);
  });

  it("varie les jeux d'un mot à l'autre", () => {
    const kinds = new Set(planned.filter(isGame).map((g) => g.type));
    expect(kinds.size).toBeGreaterThanOrEqual(4);
    for (const kind of kinds) expect(GAME_TYPES).toContain(kind);
  });

  it("construit chaque jeu à partir des données du mot", () => {
    for (const game of planned.filter(isGame)) {
      const w = WORDS.find((x) => x.id === game.wordId)!;
      if (game.type === "listen") {
        expect(game.answerId).toBe(w.id);
        expect(game.choices.find((c) => c.id === w.id)?.text).toBe(w.fr);
      } else if (game.type === "listen_ar") {
        expect(game.choices.find((c) => c.id === w.id)?.text).toBe(w.headword);
      } else if (game.type === "true_false") {
        if (game.isTrue) expect(game.proposed).toBe(w.fr);
        else expect(game.proposed).not.toBe(w.fr);
      } else if (game.type === "missing_letter") {
        expect(game.choices).toContain(game.answer);
      }
    }
  });
});

describe("planSession : révision", () => {
  const exercises: Exercise[] = WORDS.map((w, i) => choices(i % 2 === 0 ? "ar_to_fr" : "fr_to_ar", w));
  const planned = planSession({ kind: "review", words: WORDS, exercises }, seeded(9));

  it("garde le même nombre de questions et remplace une question sur trois par un jeu", () => {
    expect(planned).toHaveLength(exercises.length);
    planned.forEach((e: SessionExercise, i) => {
      if (i % 3 === 2) expect(isGame(e)).toBe(true);
      else expect(e).toEqual(exercises[i]);
    });
  });

  it("le jeu porte sur le mot de la question remplacée", () => {
    const game = planned[2]!;
    expect(isGame(game) && game.wordId).toBe((exercises[2] as { wordId: string }).wordId);
  });
});
