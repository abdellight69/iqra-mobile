import { shuffle, shufflePairs } from "../shuffle";

/** Suite pseudo-aléatoire déterministe (LCG) pour des tests reproductibles. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

// Identifiants réels d'une fiche : ils ne diffèrent que par leur dernier caractère, ce qui mettait
// en défaut l'ancien mélange par hachage (même ordre quelle que soit la graine).
const IDS = ["p23-01", "p23-02", "p23-03", "p23-04"];

describe("shuffle", () => {
  it("renvoie une permutation sans modifier l'original", () => {
    const random = seeded(1);
    const out = shuffle(IDS, random);
    expect([...out].sort()).toEqual([...IDS].sort());
    expect(IDS).toEqual(["p23-01", "p23-02", "p23-03", "p23-04"]);
  });

  it("produit des ordres différents selon le tirage", () => {
    const orders = new Set(Array.from({ length: 50 }, (_, i) => shuffle(IDS, seeded(i)).join(",")));
    expect(orders.size).toBeGreaterThan(5);
  });
});

describe("shufflePairs : colonnes du jeu d'association", () => {
  it("ne met jamais une paire en face de son vis-à-vis", () => {
    for (let seed = 0; seed < 200; seed++) {
      const { left, right } = shufflePairs(IDS, seeded(seed));
      expect([...left].sort()).toEqual([...IDS].sort());
      expect([...right].sort()).toEqual([...IDS].sort());
      right.forEach((id, i) => expect(id).not.toBe(left[i]));
    }
  });

  it("mélange aussi la colonne de gauche", () => {
    const lefts = new Set(Array.from({ length: 50 }, (_, i) => shufflePairs(IDS, seeded(i)).left.join(",")));
    expect(lefts.size).toBeGreaterThan(5);
  });

  it("tient avec trois mots (association proposée dès trois mots)", () => {
    const { left, right } = shufflePairs(IDS.slice(0, 3), seeded(7));
    right.forEach((id, i) => expect(id).not.toBe(left[i]));
  });

  it("se replie sur un décalage si le tirage n'aboutit pas", () => {
    // Tirage constant : Fisher-Yates renvoie toujours la même permutation, jamais un dérangement.
    const { left, right } = shufflePairs(IDS, () => 0);
    expect(right).toEqual([...left.slice(1), left[0]]);
  });

  it("garde un seul mot aligné (pas d'autre possibilité)", () => {
    expect(shufflePairs(["a"], seeded(1))).toEqual({ left: ["a"], right: ["a"] });
  });
});
