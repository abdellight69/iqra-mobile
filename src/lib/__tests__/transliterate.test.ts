import { annotateArabic, hasArabic, transliterate } from "../transliterate";

describe("transliterate : phonétique des mots vocalisés du lexique", () => {
  it.each([
    ["هَذَا", "hâdhâ"],
    ["كِتَابٌ", "kitâboun"],
    ["كِتَابًا", "kitâban"],
    ["يَفْعَلُ", "yafʿalou"],
    ["اِفْعَلْ", "ifʿal"],
    ["أَنْتَ", "anta"],
    ["إِيَّاكَ", "iyyâka"],
    ["نُور", "noûr"],
    ["فِي", "fî"],
    ["يَوْم", "yawm"],
    ["بَيْنَ", "bayna"],
    ["عَلَى", "ʿalâ"],
    ["قُرْآن", "qourʾân"],
    ["مُؤْمِن", "mouʾmin"],
    ["شَيْء", "chayʾ"],
    ["رَحْمَة", "raḥma"],
    ["رَحْمَةٌ", "raḥmatoun"],
    ["الرَّحْمَن", "ar-raḥmân"],
    ["الْكِتَاب", "al-kitâb"],
    ["الدِّين", "ad-dîn"],
    ["الَّذِينَ", "alladhîna"],
    ["هَذِهِ", "hâdhihi"],
    ["ذَلِكَ", "dhâlika"],
    ["الإِشَارَة", "al-ichâra"],
    ["الله", "Allâh"],
    ["لِلّٰهِ", "lillâhi"],
    ["إِلَّا اللَّهُ", "illâ Allâhou"],
  ])("%s → %s", (arabic, expected) => {
    expect(transliterate(arabic)).toBe(expected);
  });

  it("rend le texte uthmani de Quran.com (alif wasla, petit alif)", () => {
    expect(transliterate("بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ")).toBe("bismi Allâhi ar-raḥmâni ar-raḥîmi");
  });

  it("conserve les séparateurs entre plusieurs formes", () => {
    expect(transliterate("أيْنَ / أَيْنَمَا")).toBe("ayna / aynamâ");
    expect(transliterate("بَيْنَ أَيْدي، بَيْنَ يَدَيْ")).toBe("bayna aydî, bayna yaday");
  });

  it("lit les deux voyelles d'un schème du livre", () => {
    expect(transliterate("فَِعْل")).toBe("fa/iʿl");
  });

  it("laisse le texte sans arabe inchangé", () => {
    expect(transliterate("m. sg.")).toBe("m. sg.");
  });
});

describe("annotateArabic : phonétique glissée dans une note en français", () => {
  it("ajoute la phonétique après chaque passage arabe", () => {
    expect(annotateArabic("m. sg. (هَذان dl.)")).toBe("\u200Em. sg. (هَذان (hâdhân) dl.)");
    expect(annotateArabic("fm. sg. ou pluriel inanimé")).toBe("fm. sg. ou pluriel inanimé");
  });
});

describe("hasArabic", () => {
  it("détecte une lettre arabe", () => {
    expect(hasArabic("هُوَ")).toBe(true);
    expect(hasArabic("Lui")).toBe(false);
    expect(hasArabic(null)).toBe(false);
  });
});
