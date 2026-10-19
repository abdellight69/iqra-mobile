import { explainLabel, explainPersonGenderNumber, explainSegment, FEATURE_HELP, NATURE_HELP } from "../grammar-help";
import { TAJWEED_GLOSSARY, TAJWEED_RULES } from "../tajweed";
import type { Segment } from "../types";

// Codes émis par le backend (src/modules/quran/grammar.ts) : natures et traits.
const NATURE_CODES = [
  "N", "V", "P", "PN", "PRON", "DEM", "REL", "T", "LOC", "NV", "COND", "INTG",
  "DET", "EMPH", "IMPV", "PRP", "CONJ", "SUB", "ACC", "AMD", "ANS", "AVR", "CAUS", "CERT", "CIRC", "COM", "EQ", "EXH", "EXL", "EXP",
  "FUT", "INC", "INT", "NEG", "PREV", "PRO", "REM", "RES", "RET", "RSLT", "SUP", "SUR", "VOC", "ATT", "DIST", "ADDR", "INL",
];
const FEATURE_CODES = ["ACT_PCPL", "PASS_PCPL", "VN", "NOM", "ACC", "GEN", "ADJ", "INDEF", "PASS", "PERF", "IMPF", "IMPV", "MOOD:IND", "MOOD:SUBJ", "MOOD:JUS"];

const label = (code: string, fr: string) => ({ code, ar: "", fr });

describe("aide grammaticale", () => {
  it("explique toutes les natures et tous les traits connus du backend", () => {
    for (const code of NATURE_CODES) expect(NATURE_HELP[code]).toBeTruthy();
    for (const code of FEATURE_CODES) expect(FEATURE_HELP[code]).toBeTruthy();
  });

  it("traduit personne, genre et nombre en pronom courant", () => {
    expect(explainPersonGenderNumber("3MP")).toBe("ils / eux (celui dont on parle, masculin, pluriel)");
    expect(explainPersonGenderNumber("2FS")).toBe("tu / toi (femme) (celui à qui l'on parle, féminin, singulier)");
    expect(explainPersonGenderNumber("MS")).toBe("masculin, singulier");
    expect(explainPersonGenderNumber("GEN")).toBeNull();
  });

  it("explique une étiquette selon son rôle", () => {
    expect(explainLabel(label("GEN", "Cas génitif"), "feature")).toMatch(/Génitif/);
    expect(explainLabel(label("VF:4", "Forme IV"), "feature")).toMatch(/Forme du verbe/);
    expect(explainLabel(label("PRON", "Pronom"), "nature")).toMatch(/pronom/i);
    expect(explainLabel(label("XYZ", "?"), "feature")).toBeNull();
  });

  it("formule une phrase en clair pour chaque morceau du mot", () => {
    const prefix: Segment = { form: "وَ", position: "prefix", partOfSpeech: label("P", "Particule"), category: label("CONJ", "Conjonction"), features: [], root: null, lemma: null, verbForm: null, family: null };
    const stem: Segment = { form: "كِتَٰبِ", position: "stem", partOfSpeech: label("N", "Nom"), category: null, features: [label("GEN", "Cas génitif"), label("M", "masculin")], root: "كتب", lemma: "كِتَاب", verbForm: null, family: null };
    const suffix: Segment = { form: "هِمْ", position: "suffix", partOfSpeech: label("N", "Nom"), category: label("PRON", "Pronom"), features: [label("3MP", "3e pers., masculin, pluriel")], root: null, lemma: null, verbForm: null, family: null };
    const verb: Segment = { form: "قَالُوا", position: "stem", partOfSpeech: label("V", "Verbe"), category: null, features: [label("PERF", "Accompli"), label("3MP", "3e pers., masculin, pluriel")], root: "قول", lemma: "قَالَ", verbForm: null, family: null };
    expect(explainSegment(prefix)).toBe("Petit mot collé au début, une conjonction : elle relie deux mots ou deux phrases (et, puis, ou).");
    expect(explainSegment(stem)).toBe("Cœur du mot, un nom : il désigne une chose, une personne ou une idée.");
    expect(explainSegment(suffix)).toBe("Petit mot collé à la fin, un pronom : il remplace un nom (il, elle, eux, vous…). Ici : « ils / eux ».");
    expect(explainSegment(verb)).toBe("Cœur du mot, un verbe : il exprime une action ou un état. Sujet : « ils / eux ».");
  });
});

describe("règles de tajwid", () => {
  it("ont toutes une explication en clair", () => {
    for (const rule of Object.values(TAJWEED_RULES)) expect(rule.how.length).toBeGreaterThan(20);
  });

  it("le glossaire couvre les termes cités par les règles", () => {
    const text = Object.values(TAJWEED_RULES)
      .map((r) => `${r.name} ${r.description} ${r.how}`)
      .join(" ")
      .toLowerCase();
    for (const term of ["ghunna", "madd", "idghâm", "ikhfâ’", "iqlâb", "qalqala", "tanwîn", "temps", "hamza"]) {
      expect(text).toContain(term);
      expect(TAJWEED_GLOSSARY.some((g) => g.term.toLowerCase().startsWith(term))).toBe(true);
    }
  });
});
