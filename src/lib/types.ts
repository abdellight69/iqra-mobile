// Types des réponses de l'API Iqra (voir backend/src).

export type User = {
  id: string;
  email: string;
  displayName: string;
  translationId: number | null;
  recitationId: number | null;
  dailyGoalXp: number;
  createdAt: string;
};

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
};

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
};

export type VersePage = {
  chapter: Chapter;
  verses: Verse[];
  pagination: { page: number; perPage: number; totalPages: number; totalVerses: number };
};

export type ChapterInfo = { chapterId: number; paragraphs: string[]; shortText: string; source: string; languageName: string | null };
export type ChapterAudio = { chapterId: number; recitationId: number; files: { verseKey: string; url: string }[] };

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
export type LearningSession = { kind: "lesson" | "review"; lessonId: string | null; words: VocabWord[]; exercises: Exercise[] };
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

export type Stats = {
  xp: number;
  currentStreak: number;
  longestStreak: number;
  today: { day: string; xp: number; goalXp: number; wordsReviewed: number; versesReviewed: number; versesRead: number };
  lastDays: { day: string; xp: number }[];
  vocabulary: { learned: number; mastered: number; due: number };
  memorization: { verses: number; solid: number; due: number };
};

export type Bookmark = { id: string; chapterId: number; verseNumber: number; note: string | null; createdAt: string };
export type ReadingPosition = { chapterId: number; verseNumber: number; updatedAt: string } | null;
