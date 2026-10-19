/**
 * Phonétique (translittération) d'un mot arabe vocalisé, dans la graphie usuelle des
 * lecteurs francophones : « ch » pour ش, « ou » pour la damma, voyelles longues â î oû,
 * emphatiques pointées (ṣ ḍ ṭ ẓ), ʿayn « ʿ » et hamza « ʾ ». Les mots du lexique portent
 * toutes leurs voyelles ; sans voyelle, seules les consonnes sont rendues.
 */

const CONSONANTS: Record<string, string> = {
  ب: "b",
  ت: "t",
  ث: "th",
  ج: "j",
  ح: "ḥ",
  خ: "kh",
  د: "d",
  ذ: "dh",
  ر: "r",
  ز: "z",
  س: "s",
  ش: "ch",
  ص: "ṣ",
  ض: "ḍ",
  ط: "ṭ",
  ظ: "ẓ",
  ع: "ʿ",
  غ: "gh",
  ف: "f",
  ق: "q",
  ك: "k",
  ل: "l",
  م: "m",
  ن: "n",
  ه: "h",
  و: "w",
  ي: "y",
  ء: "ʾ",
  ؤ: "ʾ",
  ئ: "ʾ",
  ک: "k",
  ی: "y",
};

/** Lettres solaires : le lām de l'article s'assimile (ar-raḥmân, ach-chams). */
const SUN_LETTERS = new Set("تثدذرزسشصضطظلن");

const FATHA = "َ";
const DAMMA = "ُ";
const KASRA = "ِ";
const SUKUN = "ْ";
const SHADDA = "ّ";
const FATHATAN = "ً";
const DAMMATAN = "ٌ";
const KASRATAN = "ٍ";
const DAGGER_ALIF = "ٰ";
const MADDA = "ٓ";
const HAMZA_ABOVE = "ٔ";

const SHORT_VOWELS: Record<string, string> = { [FATHA]: "a", [DAMMA]: "ou", [KASRA]: "i", [FATHATAN]: "an", [DAMMATAN]: "oun", [KASRATAN]: "in", [DAGGER_ALIF]: "â" };

/** Mots figés dont la graphie usuelle ne suit pas les règles générales. */
const FIXED: Record<string, string> = {
  // Démonstratifs et mots courants écrits sans alif long dans le livre (sans la voyelle finale,
  // ajoutée à la lecture : « hâdhih » + « i »).
  هَذَا: "hâdhâ",
  هَذِه: "hâdhih",
  هَذَان: "hâdhân",
  هَذان: "hâdhân",
  هَؤُلَاء: "hâʾoulâʾ",
  ذَلِك: "dhâlik",
  تِلْك: "tilk",
  أُولَئِك: "oulâʾik",
  لَكِن: "lâkin",
  لَكِنّ: "lâkinn",
  الرَّحْمَن: "ar-raḥmân",
  ٱلرَّحْمَٰن: "ar-raḥmân",
};

type Token = { letter: string; marks: string[] };

const ARABIC_LETTER = /[ء-غف-يٱکی]/u;
const IGNORED = /[ـۖ-ۭٕٖٜٗ٘]/u;

function tokenize(word: string): Token[] {
  const tokens: Token[] = [];
  for (const char of word) {
    if (IGNORED.test(char)) continue;
    if (/[\p{M}]/u.test(char)) {
      const last = tokens.at(-1);
      if (last) last.marks.push(char);
      continue;
    }
    tokens.push({ letter: char, marks: [] });
  }
  return tokens;
}

function vowelOf(marks: string[]): string {
  // Le petit alif suscrit allonge la voyelle, quelle que soit la fatḥa écrite à côté.
  if (marks.includes(DAGGER_ALIF)) return "â";
  const vowels = marks.map((m) => SHORT_VOWELS[m]).filter((v): v is string => v !== undefined);
  if (vowels.length === 0) return "";
  // Signe double sur une même lettre (schème du livre « فَِعْل ») : les deux lectures.
  return [...new Set(vowels)].join("/");
}

function hasVowel(marks: string[]): boolean {
  return marks.some((m) => SHORT_VOWELS[m] !== undefined);
}

/** Translittère un seul mot (sans espace). */
function transliterateWord(word: string): string {
  // Mot figé, éventuellement suivi de sa voyelle casuelle (« Allâhi »).
  const trailing = /[\u064B-\u0650]$/u.exec(word)?.[0] ?? "";
  const base = word.slice(0, word.length - trailing.length).normalize("NFC");
  const bare = base.replace(/\p{M}/gu, "");
  const fixed = FIXED[base] ?? (bare === "الله" || bare === "ٱلله" ? "Allâh" : bare === "لله" ? "lillâh" : undefined);
  if (fixed) return fixed + vowelOf(trailing ? [trailing] : []);
  const tokens = tokenize(word);
  if (tokens.length === 0) return word;

  const parts: { cons: string; vowel: string }[] = [];
  let i = 0;

  // Article défini « ال » (ou « ٱل ») en tête, lām non vocalisé.
  if (tokens.length >= 3 && (tokens[0]!.letter === "ا" || tokens[0]!.letter === "ٱ") && tokens[1]!.letter === "ل" && !hasVowel(tokens[1]!.marks)) {
    const next = tokens[2]!;
    const prefixVowel = vowelOf(tokens[0]!.marks) || "a";
    if (SUN_LETTERS.has(next.letter) && next.marks.includes(SHADDA)) {
      // Le lām disparaît, la solaire est doublée : « ar-raḥmân ».
      const cons = CONSONANTS[next.letter] ?? "";
      parts.push({ cons: `${prefixVowel}${cons}-${cons}`, vowel: vowelOf(next.marks) });
      i = 3;
    } else {
      parts.push({ cons: `${prefixVowel}l-`, vowel: "" });
      i = 2;
    }
  }

  for (; i < tokens.length; i++) {
    const { letter, marks } = tokens[i]!;
    const previous = parts.at(-1);
    const vowel = vowelOf(marks);
    const shadda = marks.includes(SHADDA);
    const isLast = i === tokens.length - 1;
    // En tête de mot, ou juste après l'article : la hamza initiale ne s'écrit pas (« al-ichâra »).
    const first = parts.length === 0 || (parts.length === 1 && parts[0]!.cons.endsWith("-"));

    switch (letter) {
      case "ا":
      case "ٱ": {
        if (marks.includes(MADDA)) {
          parts.push({ cons: first ? "" : "ʾ", vowel: "â" });
        } else if (marks.includes(HAMZA_ABOVE)) {
          parts.push({ cons: first ? "" : "ʾ", vowel: vowel || (first ? "a" : "") });
        } else if (previous && !vowel && previous.vowel === "a") {
          previous.vowel = "â";
        } else if (previous && !vowel && previous.vowel === "an") {
          // Tanwîn fatḥa suivi d'un alif muet : « kitâban ».
        } else if (previous && !vowel && previous.vowel === "") {
          // Alif de prolongation sur une consonne non vocalisée (texte partiellement vocalisé).
          previous.vowel = "â";
        } else {
          parts.push({ cons: "", vowel: vowel || (first ? "a" : "") });
        }
        break;
      }
      case "آ":
        parts.push({ cons: first ? "" : "ʾ", vowel: "â" });
        break;
      case "أ":
        parts.push({ cons: first ? "" : "ʾ", vowel: vowel || (first ? "a" : "") });
        break;
      case "إ":
        parts.push({ cons: first ? "" : "ʾ", vowel: vowel || "i" });
        break;
      case "ى": {
        if (previous && !vowel && (previous.vowel === "a" || previous.vowel === "")) previous.vowel = "â";
        else parts.push({ cons: "", vowel: vowel || "â" });
        break;
      }
      case "ة": {
        if (vowel) parts.push({ cons: "t", vowel });
        else if (previous && previous.vowel === "") {
          previous.vowel = "a";
        } else parts.push({ cons: "", vowel: "" }); // la fatḥa précédente se lit déjà « a »
        break;
      }
      case "و": {
        const long = previous && !vowel && !shadda && previous.vowel === "ou" && !marks.includes(SUKUN);
        if (long) previous.vowel = "oû";
        else parts.push({ cons: shadda ? "ww" : "w", vowel });
        break;
      }
      case "ي":
      case "ی": {
        const long = previous && !vowel && !shadda && previous.vowel === "i" && !marks.includes(SUKUN);
        if (long) previous.vowel = "î";
        else if (isLast && !vowel && !shadda && previous && previous.vowel === "") previous.vowel = "î";
        else parts.push({ cons: shadda ? "yy" : "y", vowel });
        break;
      }
      default: {
        const cons = CONSONANTS[letter];
        if (cons === undefined) {
          parts.push({ cons: letter, vowel });
          break;
        }
        parts.push({ cons: shadda ? cons + cons : cons, vowel });
      }
    }
  }

  return parts.map((p) => p.cons + p.vowel).join("");
}

/**
 * Phonétique d'un texte arabe : chaque mot est translittéré, les séparateurs (espaces, « / »,
 * virgules, parenthèses) sont conservés. Les caractères non arabes restent tels quels.
 */
export function transliterate(text: string): string {
  return text.replace(/[\u0620-\u065F\u0670-\u06FF]+/gu, (word) => transliterateWord(word)).replace(/،/g, ",");
}

/**
 * Texte mêlant français et arabe (notes du livre : « m. sg. (هَذان dl.) ») : chaque passage
 * arabe est suivi de sa phonétique entre parenthèses.
 */
export function annotateArabic(text: string): string {
  if (!hasArabic(text)) return text;
  // Marque gauche-à-droite en tête : sinon une note qui commence par de l'arabe (« (رُحَمَاء pl.) »)
  // est rendue de droite à gauche et ses parties françaises se retrouvent inversées.
  return "\u200E" + text.replace(/[\u0620-\u065F\u0670-\u06FF](?:[\u0620-\u065F\u0670-\u06FF \u060C]*[\u0620-\u065F\u0670-\u06FF])?/gu, (run) => `${run} (${transliterate(run)})`);
}

/** Vrai si le texte contient au moins une lettre arabe. */
export function hasArabic(text: string | null | undefined): boolean {
  return Boolean(text && ARABIC_LETTER.test(text));
}
