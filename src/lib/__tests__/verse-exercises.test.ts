import {
  blankCount,
  composeLetters,
  errorsLabel,
  fillBlanks,
  neighbourVerseKey,
  offerFill,
  orderTiles,
  segmentWords,
  stripDiacritics,
  verseWords,
} from "../verse-exercises";

function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

/** Al-Ikhlâs, verset 1 : « قُلْ هُوَ ٱللَّهُ أَحَدٌ ». */
const IKHLAS_1 = ["قُلْ", "هُوَ", "ٱللَّهُ", "أَحَدٌ"];
/** Al-Ikhlâs, verset 2 : « ٱللَّهُ ٱلصَّمَدُ ». */
const IKHLAS_2 = ["ٱللَّهُ", "ٱلصَّمَدُ"];

describe("stripDiacritics", () => {
  it("retire voyelles, tanwîn, alif suscrit et tatwîl, garde les lettres", () => {
    expect(stripDiacritics("كِتَابٌ")).toBe("كتاب");
    expect(stripDiacritics("ٱلرَّحْمَـٰنِ")).toBe("ٱلرحمن");
    expect(stripDiacritics("قلم")).toBe("قلم");
  });
});

describe("verseWords", () => {
  it("ne garde que les mots (pas le numéro de fin de verset)", () => {
    const words = [
      { type: "word", textUthmani: "قُلْ" },
      { type: "word", textUthmani: "هُوَ" },
      { type: "end", textUthmani: "١" },
    ];
    expect(verseWords(words).map((w) => w.textUthmani)).toEqual(["قُلْ", "هُوَ"]);
  });
});

describe("segmentWords", () => {
  const words = (n: number) => Array.from({ length: n }, (_, i) => `m${i}`);

  it("garde un verset de 12 mots ou moins en une seule partie", () => {
    expect(segmentWords(words(12))).toEqual([words(12)]);
    expect(segmentWords(words(4))).toHaveLength(1);
    expect(segmentWords([])).toEqual([]);
  });

  it("découpe un long verset en parties équilibrées de 12 mots au plus, dans l'ordre", () => {
    const parts = segmentWords(words(13));
    expect(parts.map((p) => p.length)).toEqual([7, 6]);
    expect(parts.flat()).toEqual(words(13));
    expect(segmentWords(words(30)).map((p) => p.length)).toEqual([10, 10, 10]);
    for (const part of segmentWords(words(50))) expect(part.length).toBeLessThanOrEqual(12);
  });
});

describe("orderTiles", () => {
  it("mélange sans perdre ni dupliquer, avec l'identifiant de la position d'origine", () => {
    const tiles = orderTiles(IKHLAS_1, seeded(7));
    expect(tiles).toHaveLength(4);
    expect(tiles.map((t) => t.id).sort()).toEqual([0, 1, 2, 3]);
    for (const tile of tiles) expect(tile.text).toBe(IKHLAS_1[tile.id]);
  });

  it("ne rend jamais l'ordre déjà résolu et reste déterministe pour une même graine", () => {
    for (let seed = 0; seed < 40; seed++) {
      const tiles = orderTiles(IKHLAS_2, seeded(seed));
      expect(tiles.map((t) => t.text)).not.toEqual(IKHLAS_2);
    }
    expect(orderTiles(IKHLAS_1, seeded(5))).toEqual(orderTiles(IKHLAS_1, seeded(5)));
  });

  it("laisse tel quel un texte d'un seul mot ou de mots tous identiques", () => {
    expect(orderTiles(["قُلْ"], seeded(1))).toEqual([{ id: 0, text: "قُلْ" }]);
    expect(orderTiles(["لا", "لا"], seeded(1)).map((t) => t.text)).toEqual(["لا", "لا"]);
  });
});

describe("composeLetters", () => {
  it("découpe le mot en lettres isolées sans ses signes", () => {
    expect(composeLetters("كِتَابٌ")).toEqual(["ك", "ت", "ا", "ب"]);
    expect(composeLetters("ٱلرَّحْمَـٰنِ")).toEqual(["ٱ", "ل", "ر", "ح", "م", "ن"]);
  });

  it("ne garde que la première forme d'une entrée multiple et ignore les espaces", () => {
    expect(composeLetters("أيْنَ / أَيْنَمَا")).toEqual(["أ", "ي", "ن"]);
    expect(composeLetters("بِسْمِ ٱللَّهِ")).toEqual(["ب", "س", "م", "ٱ", "ل", "ل", "ه"]);
  });

  it("renvoie null pour une lettre seule, un texte vide ou un mot trop long", () => {
    expect(composeLetters("و")).toBeNull();
    expect(composeLetters(null)).toBeNull();
    expect(composeLetters("")).toBeNull();
    expect(composeLetters("ابتثجحخدذرزس")).toBeNull();
  });
});

describe("blankCount", () => {
  it("adapte le nombre de trous à la longueur du verset en laissant toujours un mot visible", () => {
    expect(blankCount(1)).toBe(0);
    expect(blankCount(2)).toBe(1);
    expect(blankCount(3)).toBe(1);
    expect(blankCount(4)).toBe(2);
    expect(blankCount(7)).toBe(2);
    expect(blankCount(8)).toBe(3);
    expect(blankCount(20)).toBe(3);
  });
});

describe("fillBlanks", () => {
  it("cache des positions distinctes et valides, chaque trou avec trois propositions dont la bonne", () => {
    const blanks = fillBlanks(IKHLAS_1, IKHLAS_2, seeded(11));
    expect(blanks).toHaveLength(2);
    expect(new Set(blanks.map((b) => b.index)).size).toBe(2);
    for (const blank of blanks) {
      expect(blank.index).toBeGreaterThanOrEqual(0);
      expect(blank.index).toBeLessThan(IKHLAS_1.length);
      expect(blank.answer).toBe(IKHLAS_1[blank.index]);
      expect(blank.options).toHaveLength(3);
      expect(blank.options).toContain(blank.answer);
      expect(new Set(blank.options.map(stripDiacritics)).size).toBe(3);
    }
  });

  it("prend ses distracteurs dans le verset, puis dans le verset voisin quand il manque des mots", () => {
    const [blank] = fillBlanks(IKHLAS_2, IKHLAS_1, seeded(3));
    expect(blank).toBeDefined();
    const others = blank!.options.filter((o) => o !== blank!.answer);
    expect(others).toHaveLength(2);
    for (const option of others) expect([...IKHLAS_2, ...IKHLAS_1]).toContain(option);
    // Sans voisin ni autre mot distinct : moins de trois propositions, jamais de doublon.
    const [lonely] = fillBlanks(["ٱللَّهُ", "ٱلله"], [], seeded(3));
    expect(lonely!.options).toEqual([lonely!.answer]);
  });

  it("évite deux trous voisins quand le verset le permet et respecte le nombre demandé", () => {
    const words = Array.from({ length: 9 }, (_, i) => `م${i}`);
    for (let seed = 0; seed < 20; seed++) {
      const indices = fillBlanks(words, [], seeded(seed)).map((b) => b.index);
      expect(indices).toHaveLength(3);
      for (let i = 1; i < indices.length; i++) expect(indices[i]! - indices[i - 1]!).toBeGreaterThan(1);
    }
    expect(fillBlanks(words, [], seeded(1), 1)).toHaveLength(1);
    expect(fillBlanks(["قُلْ"], [], seeded(1))).toEqual([]);
  });
});

describe("offerFill et neighbourVerseKey", () => {
  it("propose « Compléter » à l'adulte en révision, à l'enfant sur un verset court", () => {
    expect(offerFill({ kids: false, wordCount: 4, review: false })).toBe(false);
    expect(offerFill({ kids: false, wordCount: 4, review: true })).toBe(true);
    expect(offerFill({ kids: false, wordCount: 20, review: true })).toBe(true);
    expect(offerFill({ kids: true, wordCount: 8, review: false })).toBe(true);
    expect(offerFill({ kids: true, wordCount: 9, review: true })).toBe(false);
    expect(offerFill({ kids: true, wordCount: 1, review: true })).toBe(false);
  });

  it("choisit le verset suivant, sinon le précédent, sinon aucun", () => {
    expect(neighbourVerseKey(112, 1, 4)).toBe("112:2");
    expect(neighbourVerseKey(112, 4, 4)).toBe("112:3");
    expect(neighbourVerseKey(112, 1, undefined)).toBeNull();
    expect(neighbourVerseKey(112, 1, 1)).toBeNull();
  });
});

describe("errorsLabel", () => {
  it("accorde le mot « erreur »", () => {
    expect(errorsLabel(0)).toBe("sans erreur");
    expect(errorsLabel(1)).toBe("1 erreur");
    expect(errorsLabel(2)).toBe("2 erreurs");
  });
});
