import { isCombiningMark, joinTajweedPieces, type TajweedPiece, ZWJ } from "../tajweed";

// Lettres et signes, écrits en codes pour que les attendus soient sans ambiguïté.
const ALIF = "ا";
const ALIF_WASLA = "ٱ";
const HAMZA_ALIF = "أ";
const HA = "ح";
const DAL = "د";
const JIM = "ج";
const LAM = "ل";
const HAMZA = "ء";
const YA = "ي";
const MIM = "م";
const NUN = "ن";
const QAF = "ق";
const FATHA = "َ";
const DAMMA = "ُ";
const DAMMATAN = "ٌ";
const SUKUN = "ْ";
const SHADDA = "ّ";
const MADD = "ٓ";

const withoutZwj = (pieces: TajweedPiece[]) => pieces.map((p) => ({ text: p.text.replaceAll(ZWJ, ""), rule: p.rule }));
const wholeWord = (pieces: TajweedPiece[]) => pieces.map((p) => p.text.replaceAll(ZWJ, "")).join("");

describe("mots colorés sans lettres détachées", () => {
  it("reconnaît les signes posés sur une lettre", () => {
    expect(isCombiningMark(FATHA)).toBe(true);
    expect(isCombiningMark(MADD)).toBe(true);
    expect(isCombiningMark("ٰ")).toBe(true); // alif suscrit
    expect(isCombiningMark(DAL)).toBe(false);
  });

  it("garde le mot intact et ses couleurs (ahadun, qalqala sur le dal)", () => {
    // Quran.com : « أَحَ » + <qalqalah>« د »</qalqalah> + « ٌ » (le tanwin hors de la balise).
    const joined = joinTajweedPieces([
      { text: HAMZA_ALIF + FATHA + HA + FATHA, rule: null },
      { text: DAL, rule: "qalqalah" },
      { text: DAMMATAN, rule: null },
    ]);
    expect(wholeWord(joined)).toBe(HAMZA_ALIF + FATHA + HA + FATHA + DAL + DAMMATAN);
    // Le tanwin rejoint le dal coloré ; aucun morceau ne commence par un signe.
    expect(withoutZwj(joined)).toEqual([
      { text: HAMZA_ALIF + FATHA + HA + FATHA, rule: null },
      { text: DAL + DAMMATAN, rule: "qalqalah" },
    ]);
  });

  it("lie deux lettres coupées par une couleur, avec un liant invisible de chaque côté", () => {
    const joined = joinTajweedPieces([
      { text: HA + FATHA, rule: null },
      { text: DAL, rule: "qalqalah" },
    ]);
    expect(joined[0]!.text).toBe(HA + FATHA + ZWJ);
    expect(joined[1]!.text).toBe(ZWJ + DAL);
  });

  it("ne lie pas après une lettre qui ne se lie jamais à la suivante (alif, dal, ra, waw…)", () => {
    const joined = joinTajweedPieces([
      { text: ALIF_WASLA, rule: "ham_wasl" },
      { text: LAM + LAM + SHADDA + FATHA, rule: null },
    ]);
    expect(joined.map((p) => p.text)).toEqual([ALIF_WASLA, LAM + LAM + SHADDA + FATHA]);
  });

  it("donne la couleur du madd à sa lettre quand le signe est coloré seul", () => {
    // « جَا » + <madda>« ٓ »</madda> + « ءَ » : l'alif part dans la couleur du madd, avec son signe.
    const joined = joinTajweedPieces([
      { text: JIM + FATHA + ALIF, rule: null },
      { text: MADD, rule: "madda_obligatory" },
      { text: HAMZA + FATHA, rule: null },
    ]);
    expect(withoutZwj(joined)).toEqual([
      { text: JIM + FATHA, rule: null },
      { text: ALIF + MADD, rule: "madda_obligatory" },
      { text: HAMZA + FATHA, rule: null },
    ]);
    // Le jim se lie à l'alif : liant ; l'alif ne se lie pas à la hamza : pas de liant.
    expect(joined[0]!.text.endsWith(ZWJ)).toBe(true);
    expect(joined[1]!.text).toBe(ZWJ + ALIF + MADD);
  });

  it("colore la lettre seule d'un morceau sans couleur quand son madd est coloré", () => {
    expect(joinTajweedPieces([
      { text: YA, rule: null },
      { text: MADD, rule: "madda_normal" },
    ])).toEqual([{ text: YA + MADD, rule: "madda_normal" }]);
  });

  it("garde la couleur d'une lettre qui a déjà sa propre règle", () => {
    expect(joinTajweedPieces([
      { text: MIM + SHADDA, rule: "ghunnah" },
      { text: MADD, rule: "madda_normal" },
    ])).toEqual([{ text: MIM + SHADDA + MADD, rule: "ghunnah" }]);
  });

  it("ne change rien à un mot sans couleur et fusionne les morceaux de même règle", () => {
    expect(joinTajweedPieces([{ text: QAF + DAMMA + LAM + SUKUN, rule: null }])).toEqual([{ text: QAF + DAMMA + LAM + SUKUN, rule: null }]);
    expect(joinTajweedPieces([
      { text: NUN + SHADDA, rule: "ghunnah" },
      { text: FATHA, rule: "ghunnah" },
    ])).toEqual([{ text: NUN + SHADDA + FATHA, rule: "ghunnah" }]);
  });
});
