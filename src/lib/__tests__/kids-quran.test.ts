import { KIDS_SURAHS, kidPhonetic, parseFinished, PRAYER_SURAHS, prayerHint } from "../kids-quran";

describe("Coran des enfants", () => {
  it("propose Al-Fâtiha puis le Juz' ʿAmma, d'An-Nâs à Al-ʿAsr", () => {
    expect(KIDS_SURAHS[0]).toBe(1);
    expect(KIDS_SURAHS[1]).toBe(114);
    expect(KIDS_SURAHS.at(-1)).toBe(103);
  });

  it("relit les sourates finies en ignorant ce qui n'en est pas", () => {
    expect(parseFinished("[1, 112, 112, 0, 115, 2.5, \"3\"]")).toEqual([1, 112]);
    expect(parseFinished("pas du json")).toEqual([]);
    expect(parseFinished("{\"a\":1}")).toEqual([]);
    expect(parseFinished(null)).toEqual([]);
  });

  it("donne la phonétique de l'app, sinon celle de Quran.com", () => {
    expect(kidPhonetic({ textUthmani: "قُلْ", transliteration: "qul" })).not.toBe("قُلْ");
    expect(kidPhonetic({ textUthmani: "", transliteration: "qul" })).toBe("qul");
  });

  it("dit à l'enfant quelles sourates se récitent dans la prière", () => {
    expect(PRAYER_SURAHS).toContain(1);
    expect(PRAYER_SURAHS).toContain(112);
    expect(prayerHint(1)).toMatch(/chaque prière/);
    expect(prayerHint(112)).toMatch(/dans ta prière/);
    expect(prayerHint(114)).toMatch(/après Al-Fâtiha/);
    expect(prayerHint(2)).toBeNull();
    expect(prayerHint(36)).toBeNull();
    // Toutes les petites sourates proposées à l'enfant ont leur mot.
    for (const id of KIDS_SURAHS) expect(prayerHint(id)).not.toBeNull();
  });
});
