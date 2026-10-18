// Types des réponses de l'API Iqra (voir backend/src).

export type User = {
  id: string;
  email: string;
  displayName: string;
  translationId: number | null;
  recitationId: number | null;
  /** Tafsir choisi (absent sur un serveur plus ancien ; null : français par défaut s'il existe). */
  tafsirId?: number | null;
  dailyGoalXp: number;
  /** Réponses du premier lancement (absentes sur un serveur plus ancien). */
  goal?: Goal | null;
  arabicLevel?: ArabicLevel | null;
  onboarded?: boolean;
  createdAt: string;
};

export type Goal = "understand" | "memorize" | "read";
export type ArabicLevel = "none" | "beginner" | "fluent";

export type AuthResponse = { user: User; accessToken: string; refreshToken: string; expiresIn: number };
export type Tokens = { accessToken: string; refreshToken: string };

export type Chapter = {
  id: number;
  nameArabic: string;
  nameSimple: string;
  nameComplex: string;
  translatedName: string;
  versesCount: number;
  revelationPlace: string;
  revelationOrder: number;
  bismillahPre: boolean;
  pages: number[];
};

export type Word = {
  location: string;
  position: number;
  type: string;
  textUthmani: string;
  transliteration: string | null;
  translation: string | null;
  translationLanguage: string | null;
  audioUrl: string | null;
  /** Texte du mot découpé selon les règles de tajwid (absent sur un serveur plus ancien). */
  tajweed?: { text: string; rule: string | null }[] | null;
};

/** Le mot du lexique tel qu'il apparaît dans le Coran (occurrence trouvée via le Corpus). */
export type QuranExample = { verseKey: string; word: Word };

/** Part des mots d'une sourate reconnue grâce aux mots appris dans les leçons. */
export type ChapterComprehension = { chapterId: number; totalWords: number; knownWords: number; coveredByBook: number };

export type NextWord = { wordId: string; lessonId: string; lessonTitle: string; headword: string; fr: string; gain: number };

export type ChapterComprehensionDetail = ChapterComprehension & { nextWords: NextWord[] };

export type Verse = {
  key: string;
  chapterId: number;
  verseNumber: number;
  textUthmani: string;
  juzNumber: number;
  hizbNumber: number;
  pageNumber: number;
  words: Word[];
  translation: { resourceId: number; resourceName: string | null; text: string } | null;
  /** Translittération du verset entier fournie par Quran.com. */
  transliteration: { resourceId: number; text: string } | null;
};

export type VersePage = {
  chapter: Chapter;
  verses: Verse[];
  pagination: { page: number; perPage: number; totalPages: number; totalVerses: number };
};

export type ChapterInfo = { chapterId: number; paragraphs: string[]; shortText: string; source: string; languageName: string | null };
/** Moment où un mot est récité dans l'audio du verset (position du mot à partir de 1). */
export type WordTiming = { position: number; startMs: number; endMs: number };
export type ChapterAudio = { chapterId: number; recitationId: number; files: { verseKey: string; url: string; words: WordTiming[] }[] };

export type Label = { code: string; ar: string; fr: string };
export type Segment = {
  form: string;
  position: "prefix" | "stem" | "suffix";
  partOfSpeech: Label;
  category: Label | null;
  features: Label[];
  root: string | null;
  lemma: string | null;
  verbForm: Label | null;
  family: Label | null;
};
export type WordDetails = {
  location: string;
  morphology: {
    location: string;
    segments: Segment[];
    root: string | null;
    lemma: string | null;
    rootOccurrences: number | null;
    lemmaOccurrences: number | null;
  } | null;
  vocabulary: { wordId: string; lessonId: string; lessonTitle: string; ar: string | null; fr: string | null; sourcePage: number }[];
};
export type RootOccurrences = {
  root: string;
  total: number;
  page: number;
  perPage: number;
  occurrences: { location: string; verseKey: string; form: string; lemma: string | null }[];
};

export type Translation = { id: number; name: string; authorName: string; languageName: string };
export type TafsirResource = { id: number; name: string; authorName: string; languageName: string };
export type VerseTafsir = {
  verseKey: string;
  frenchAvailable: boolean;
  tafsir: {
    resourceId: number;
    name: string;
    authorName: string | null;
    languageName: string | null;
    paragraphs: string[];
    groupFrom: string | null;
    groupTo: string | null;
  } | null;
};
export type Recitation = { id: number; reciterName: string; style: string | null; translatedName: string | null };

export type VerbForms = {
  past: string | null;
  present: string | null;
  imperative: string | null;
  activeParticiple: string | null;
  verbalNoun: string | null;
};

export type VocabWord = {
  id: string;
  lessonId: string;
  ar: string | null;
  arNote: string | null;
  fr: string | null;
  headword: string | null;
  groupTitleFr: string | null;
  groupTitleAr: string | null;
  sideLabel: string | null;
  occurrences: number | null;
  verb: VerbForms | null;
  isPatternRow: boolean;
  sourceUncertain: boolean;
};

export type LessonSummary = {
  id: string;
  position: number;
  part: string;
  title: string;
  titleAr: string | null;
  subtitle: string | null;
  sourcePage: number;
  wordCount: number;
  learnedCount: number;
  bestScore: number;
  completions: number;
  unlocked: boolean;
  completed: boolean;
};

export type LessonDetail = {
  lesson: {
    id: string;
    part: string;
    title: string;
    titleAr: string | null;
    subtitle: string | null;
    sourcePage: number;
    totalWords: string | null;
    remarks: string[];
  };
  words: VocabWord[];
};

export type Choice = { id: string; text: string };
export type Exercise =
  | { type: "intro"; wordId: string }
  | { type: "ar_to_fr" | "fr_to_ar"; wordId: string; choices: Choice[]; answerId: string }
  | { type: "match"; wordIds: string[] };
export type LearningSession = { kind: "lesson" | "review" | "words"; lessonId: string | null; words: VocabWord[]; exercises: Exercise[] };
export type SessionResult = { xpGained: number; score: number; correctAnswers: number; totalAnswers: number };

export type PlanProgress = { total: number; started: number; solid: number; due: number };
export type MemorizationPlan = {
  id: string;
  chapterId: number;
  fromVerse: number;
  toVerse: number;
  isWholeChapter: boolean;
  createdAt: string;
  progress: PlanProgress;
};
export type PlanVerse = {
  verseNumber: number;
  key: string;
  status: "new" | "learning" | "solid";
  due: boolean;
  dueAt: string | null;
  repetitions: number;
  intervalDays: number;
};
export type MemorizationPlanDetail = MemorizationPlan & { verses: PlanVerse[] };
export type ReviewResult = { key: string; status: PlanVerse["status"]; dueAt: string; intervalDays: number; xpGained: number };
export type DueVerse = { key: string; chapterId: number; verseNumber: number; dueAt: string; status: PlanVerse["status"] };

/** Programmes guidés : étapes quotidiennes de mémorisation ou de lecture. */
export type VerseRange = { chapterId: number; fromVerse: number; toVerse: number };
export type ProgramDay = { day: number; ranges: VerseRange[]; verses: number };
export type ProgramProgress = { startedOn: string; completedDays: number[]; nextDay: number | null; scheduledDay: number; finished: boolean };
export type ProgramSummary = {
  id: string;
  kind: "memorize" | "read";
  title: string;
  description: string;
  dayCount: number;
  verseCount: number;
  progress: ProgramProgress | null;
};
export type ProgramDetail = ProgramSummary & { days: ProgramDay[] };

export type Stats = {
  xp: number;
  currentStreak: number;
  longestStreak: number;
  today: { day: string; xp: number; goalXp: number; wordsReviewed: number; versesReviewed: number; versesRead: number };
  lastDays: { day: string; xp: number }[];
  /** Un jour manqué par semaine ne casse pas la série. */
  /** Absent si le serveur n'est pas à jour. */
  streakFreeze?: { available: boolean; pending: boolean; frozenDays: string[] };
  vocabulary: { learned: number; mastered: number; due: number };
  memorization: { verses: number; solid: number; due: number };
};

export type Bookmark = { id: string; chapterId: number; verseNumber: number; note: string | null; createdAt: string };
export type ReadingPosition = { chapterId: number; verseNumber: number; updatedAt: string } | null;

/** Vérification de la récitation : chaque mot du verset reconnu, oublié ou différent. */
export type RecitationWordStatus = "ok" | "missed" | "different";
export type RecitationCheck = {
  verseKey: string;
  heard: string;
  words: { position: number; location: string; textUthmani: string; status: RecitationWordStatus; heard: string | null }[];
  extras: { afterPosition: number; text: string }[];
  summary: { total: number; ok: number; missed: number; different: number };
};

/** Apprendre à lire : lettres, parcours et séances (exercices générés par le serveur). */
export type LetterForms = { isolated: string; initial: string | null; medial: string | null; final: string | null };
export type AlphabetLetter = {
  id: string;
  char: string;
  name: string;
  nameArabic: string;
  translit: string;
  sound: string;
  joins: boolean;
  variants: string[];
  note: string | null;
  forms: LetterForms;
  example: { location: string; text: string; reading: string };
};
export type AlphabetLessonSummary = { id: string; title: string; summary: string; kind: string; completed: boolean; bestScore: number | null };
export type AlphabetOverview = {
  letters: AlphabetLetter[];
  units: { id: number; title: string; lessons: AlphabetLessonSummary[] }[];
  completedCount: number;
  lessonCount: number;
  nextLessonId: string | null;
};
export type ReadingWord = { location: string; text: string; reading: string; audioUrl: string | null };
export type ReadingChoice = { id: string; arabic?: string; text?: string };
export type ReadingStep =
  | { type: "letter"; letterId: string; example: ReadingWord }
  | { type: "concept"; title: string; paragraphs: string[]; examples: { arabic: string; reading: string; note?: string }[] }
  | {
      type: "choice";
      question: string;
      prompt: { arabic?: string; text?: string; detail?: string; highlight?: string[]; marks?: number[]; word?: ReadingWord; listen?: boolean };
      choices: ReadingChoice[];
      answerId: string;
      reveal?: ReadingWord;
      /** Règle ou précision affichée après la réponse. */
      explain?: string;
    }
  | { type: "match"; question: string; pairs: { id: string; arabic: string; text: string }[] }
  | { type: "reading"; title: string; verses: { verseKey: string; words: ReadingWord[] }[] }
  | { type: "trace"; letterId: string }
  | { type: "spell"; word: ReadingWord; answer: string[]; tiles: string[] };
export type ReadingSession = { lesson: { id: string; title: string; summary: string; kind: string }; steps: ReadingStep[] };
export type ReadingResult = { xpGained: number; score: number; firstCompletion: boolean };
