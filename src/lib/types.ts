// Types des réponses de l'API Eqra (voir backend/src).

export type User = {
  id: string;
  /** Null pour un profil de la famille (seul le titulaire du compte a un e-mail). */
  email: string | null;
  displayName: string;
  /** Couleur du profil (absente sur un serveur plus ancien). */
  avatar?: string | null;
  /** Titulaire du compte (absent sur un serveur plus ancien : un seul profil, le titulaire). */
  isOwner?: boolean;
  /** Profil enfant : interface simplifiée, séances plus courtes (absent sur un serveur plus ancien). */
  isChild?: boolean;
  /** Abonnement « Soutien » en cours sur le compte, hérité par les profils (absent sur un serveur plus ancien). */
  supporter?: boolean;
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

export type AuthResponse = {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};
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

/** Tout ce qui aide à retenir un mot du lexique : occurrence, mini-phrase de repli, famille connue. */
export type WordContext = {
  example: QuranExample | null;
  /** Fenêtre de mots autour du mot dans le premier verset qui le contient (si pas d'occurrence sûre). */
  phrase: {
    verseKey: string;
    position: number;
    /** Mots surlignés à partir de `position` (absent : 1). */ length?: number;
    words: Word[];
  } | null;
  family: {
    root: string | null;
    known: { wordId: string; headword: string; fr: string }[];
  };
};

/** Part des mots d'une sourate reconnue grâce aux mots appris dans les leçons. */
export type ChapterComprehension = {
  chapterId: number;
  totalWords: number;
  knownWords: number;
  coveredByBook: number;
};

export type NextWord = {
  wordId: string;
  lessonId: string;
  lessonTitle: string;
  headword: string;
  fr: string;
  gain: number;
};

export type ChapterComprehensionDetail = ChapterComprehension & {
  nextWords: NextWord[];
};

/** Sourate du parcours « Comprendre une sourate ». */
export type CourseChapter = ChapterComprehension & {
  /** Entrées du livre encore à apprendre pour cette sourate. */
  missingWords: number;
  /** Premier verset contenant un mot du livre non appris (null : sourate comprise). */
  nextVerse: number | null;
  unlocked: boolean;
  done: boolean;
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
  translation: {
    resourceId: number;
    resourceName: string | null;
    text: string;
  } | null;
  /** Translittération du verset entier fournie par Quran.com. */
  transliteration: { resourceId: number; text: string } | null;
};

export type VersePage = {
  chapter: Chapter;
  verses: Verse[];
  pagination: {
    page: number;
    perPage: number;
    totalPages: number;
    totalVerses: number;
  };
};

export type ChapterInfo = {
  chapterId: number;
  paragraphs: string[];
  shortText: string;
  source: string;
  languageName: string | null;
};
/** Moment où un mot est récité dans l'audio du verset (position du mot à partir de 1). */
export type WordTiming = { position: number; startMs: number; endMs: number };
export type ChapterAudio = {
  chapterId: number;
  recitationId: number;
  files: { verseKey: string; url: string; words: WordTiming[] }[];
};

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
  vocabulary: {
    wordId: string;
    lessonId: string;
    lessonTitle: string;
    ar: string | null;
    fr: string | null;
    sourcePage: number;
  }[];
};
export type RootOccurrences = {
  root: string;
  total: number;
  page: number;
  perPage: number;
  occurrences: {
    location: string;
    verseKey: string;
    form: string;
    lemma: string | null;
  }[];
};

export type Translation = {
  id: number;
  name: string;
  authorName: string;
  languageName: string;
};
export type TafsirResource = {
  id: number;
  name: string;
  authorName: string;
  languageName: string;
};
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
    /** Notes du traducteur (tafsir hébergé). */
    footnotes?: string | null;
    /** Tafsir hébergé (QuranEnc) : source à citer, version, date de récupération du texte. */
    source?: {
      name: string;
      url: string;
      version: string | null;
      fetchedAt: string;
    };
  } | null;
};
export type Recitation = {
  id: number;
  reciterName: string;
  style: string | null;
  translatedName: string | null;
};

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
  /** Image du mot pour les enfants, relative à l'API (`/words/<id>.png`), ou null. */
  imageUrl: string | null;
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

/** Thème de vocabulaire coranique (nombres, corps humain…). */
export type ThemeSummary = {
  id: string;
  title: string;
  titleAr: string | null;
  intro: string | null;
  icon: string | null;
  /** Groupe affiché en tête de liste (« La vie quotidienne », « La foi et le Coran »). */
  group: string | null;
  wordCount: number;
  learnedCount: number;
  /** Mots du thème qui ont une image (album enfant). */
  imageCount: number;
  /** Dernière révision d'un mot du thème (ISO), ou null. */
  lastPracticedAt: string | null;
};
export type ThemeDetail = {
  theme: Omit<
    ThemeSummary,
    "group" | "wordCount" | "learnedCount" | "lastPracticedAt"
  >;
  words: VocabWord[];
  learned: string[];
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
  | {
      type: "ar_to_fr" | "fr_to_ar";
      wordId: string;
      choices: Choice[];
      answerId: string;
    }
  | { type: "match"; wordIds: string[] }
  /** Deux mots qui se ressemblent, tous deux connus : lequel a ce sens ? (noté sur `wordId`). */
  | { type: "contrast"; wordId: string; otherId: string };
export type LearningSession = {
  kind: "lesson" | "review" | "words";
  lessonId: string | null;
  words: VocabWord[];
  exercises: Exercise[];
  /** Séance planifiée sur une sourate (absent pour une leçon ou une révision). */
  chapterId?: number;
  /** Séance sur un thème. */
  themeId?: string;
  /** Séance du jour : mots nouveaux du parcours et mots à réviser. */
  daily?: { fresh: number; review: number };
  /** Séance tirée de la réserve hors ligne (préparée à l'avance). */
  offline?: boolean;
  /** Position (sourate:verset:mot) de la première apparition de chaque mot dans la sourate. */
  verseByWord?: Record<string, string>;
  verses?: { from: number; to: number } | null;
  coverage?: ChapterComprehension;
};
export type SessionResult = {
  xpGained: number;
  score: number;
  correctAnswers: number;
  totalAnswers: number;
  /** Séance faite hors ligne : gardée sur l'appareil, envoyée (XP compris) au retour du réseau. */
  queued?: boolean;
};

export type PlanProgress = {
  total: number;
  started: number;
  solid: number;
  due: number;
};
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
export type ReviewResult = {
  key: string;
  status: PlanVerse["status"];
  dueAt: string;
  intervalDays: number;
  xpGained: number;
};
export type DueVerse = {
  key: string;
  chapterId: number;
  verseNumber: number;
  dueAt: string;
  status: PlanVerse["status"];
};

/** Programmes guidés : étapes quotidiennes de mémorisation ou de lecture. */
export type VerseRange = {
  chapterId: number;
  fromVerse: number;
  toVerse: number;
};
export type ProgramDay = { day: number; ranges: VerseRange[]; verses: number };
export type ProgramProgress = {
  startedOn: string;
  completedDays: number[];
  nextDay: number | null;
  scheduledDay: number;
  finished: boolean;
};
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
  today: {
    day: string;
    xp: number;
    goalXp: number;
    wordsReviewed: number;
    versesReviewed: number;
    versesRead: number;
  };
  lastDays: { day: string; xp: number }[];
  /** Un jour manqué par semaine ne casse pas la série. */
  /** Absent si le serveur n'est pas à jour. */
  streakFreeze?: { available: boolean; pending: boolean; frozenDays: string[] };
  vocabulary: { learned: number; mastered: number; due: number };
  memorization: { verses: number; solid: number; due: number };
};

export type Bookmark = {
  id: string;
  chapterId: number;
  verseNumber: number;
  note: string | null;
  createdAt: string;
};
export type ReadingPosition = {
  chapterId: number;
  verseNumber: number;
  updatedAt: string;
} | null;

/** Vérification de la récitation : chaque mot du verset reconnu, oublié ou différent. */
export type RecitationWordStatus = "ok" | "missed" | "different";
type RecitationCounts = {
  total: number;
  ok: number;
  missed: number;
  different: number;
};
export type RecitationCheck = {
  verseKey: string;
  /** Absents d'un serveur plus ancien (un seul verset vérifié). */
  verseKeys?: string[];
  heard: string;
  words: {
    position: number;
    verseKey?: string;
    location: string;
    textUthmani: string;
    status: RecitationWordStatus;
    heard: string | null;
  }[];
  extras: { afterLocation?: string | null; text: string }[];
  summary: RecitationCounts;
  verses?: (RecitationCounts & { verseKey: string })[];
  /** Note proposée : 5 parfait, 4 bien, 3 difficile, 1 à revoir. */
  suggestedQuality?: 1 | 3 | 4 | 5;
};
/** Mot souvent oublié à la vérification vocale. */
export type WeakWord = {
  location: string;
  verseKey: string;
  misses: number;
  hits: number;
  lastMissedAt: string | null;
};

/** Apprendre à lire : lettres, parcours et séances (exercices générés par le serveur). */
export type LetterForms = {
  isolated: string;
  initial: string | null;
  medial: string | null;
  final: string | null;
};
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
export type AlphabetLessonSummary = {
  id: string;
  title: string;
  summary: string;
  kind: string;
  completed: boolean;
  bestScore: number | null;
};
export type AlphabetOverview = {
  letters: AlphabetLetter[];
  units: { id: number; title: string; lessons: AlphabetLessonSummary[] }[];
  completedCount: number;
  lessonCount: number;
  nextLessonId: string | null;
};
export type ReadingWord = {
  location: string;
  text: string;
  reading: string;
  audioUrl: string | null;
};
export type ReadingChoice = { id: string; arabic?: string; text?: string };
export type ReadingStep =
  | { type: "letter"; letterId: string; example: ReadingWord }
  | {
      type: "concept";
      title: string;
      paragraphs: string[];
      examples: { arabic: string; reading: string; note?: string }[];
    }
  | {
      type: "choice";
      question: string;
      prompt: {
        arabic?: string;
        text?: string;
        detail?: string;
        highlight?: string[];
        marks?: number[];
        word?: ReadingWord;
        listen?: boolean;
      };
      choices: ReadingChoice[];
      answerId: string;
      reveal?: ReadingWord;
      /** Règle ou précision affichée après la réponse. */
      explain?: string;
    }
  | {
      type: "match";
      question: string;
      pairs: { id: string; arabic: string; text: string }[];
    }
  | {
      type: "reading";
      title: string;
      verses: { verseKey: string; words: ReadingWord[] }[];
    }
  | { type: "trace"; letterId: string }
  | { type: "spell"; word: ReadingWord; answer: string[]; tiles: string[] };
export type ReadingSession = {
  lesson: { id: string; title: string; summary: string; kind: string };
  steps: ReadingStep[];
};
export type ReadingResult = {
  xpGained: number;
  score: number;
  firstCompletion: boolean;
};

/** Carte de la mémorisation : sourates, juz' et totaux (pages du Mushaf de Médine). */
export type MemorizationMap = {
  chapters: {
    chapterId: number;
    versesCount: number;
    tracked: number;
    solid: number;
    due: number;
  }[];
  juzs: { juz: number; verses: number; tracked: number; solid: number }[];
  totals: {
    verses: number;
    versesTracked: number;
    versesSolid: number;
    pages: number;
    pagesSolid: number;
    pagesStarted: number;
    juzSolid: number;
    juzStarted: number;
  };
};

/** Recherche : en arabe dans le texte du Coran, sinon dans les traductions (Quran Foundation). */
export type SearchResults = {
  query: string;
  source: "arabic" | "translation";
  total: number;
  page: number;
  pageSize: number;
  results: {
    key: string;
    chapterId: number;
    verseNumber: number;
    textUthmani: string;
    translation: string | null;
  }[];
};

/** Recherche unifiée (`/search`) : résultats groupés par type. */
export type SearchVerse = {
  key: string;
  chapterId: number;
  verseNumber: number;
  textUthmani: string;
  transliteration: string | null;
  translation: string | null;
  matchedBy: "reference" | "arabic" | "phonetic" | "translation";
};
export type UnifiedSearch = {
  query: string;
  chapters: {
    id: number;
    nameSimple: string;
    nameArabic: string;
    translatedName: string;
    versesCount: number;
  }[];
  verses: {
    items: SearchVerse[];
    total: number;
    matchedBy: SearchVerse["matchedBy"] | null;
  };
  words: {
    id: string;
    lessonId: string;
    lessonTitle: string;
    sourcePage: number;
    ar: string | null;
    fr: string | null;
  }[];
  lessons: {
    id: string;
    unit: number;
    unitTitle: string;
    title: string;
    summary: string;
    kind: string;
  }[];
};

export type ProfileProgress = {
  xp: number;
  currentStreak: number;
  todayXp: number;
  goalXp: number;
  wordsLearned: number;
  versesMemorized: number;
  readingLessons: number;
};
export type Profile = {
  id: string;
  displayName: string;
  avatar: string | null;
  arabicLevel: ArabicLevel | null;
  isChild?: boolean;
  isOwner: boolean;
  current: boolean;
  /** Visible du titulaire seulement. */
  progress: ProfileProgress | null;
};
export type Profiles = {
  isOwner: boolean;
  pinSet: boolean;
  maxProfiles: number;
  profiles: Profile[];
};

// ---------------------------------------------------------------------------
// Familles (backend : docs/familles-v1.md)
// ---------------------------------------------------------------------------

export type FamilySharing = "none" | "goals" | "all";
export type FamilyRole = "admin" | "member";
export type GoalMetric =
  | "verses_read"
  | "words_learned"
  | "verses_learned"
  | "reviews"
  | "active_days"
  | "xp";
export type GoalPeriod = "week" | "month";
export type GoalScope = "each" | "shared" | "assigned";
export type GoalParticipantStatus =
  "pending" | "accepted" | "declined" | "left";
export type EncouragementKind =
  "barakallah" | "almost" | "mashallah" | "count_on_you";

export type FamilySummary = {
  id: string;
  name: string;
  role: FamilyRole;
  sharing: FamilySharing;
  membersCount: number;
  activeGoals: number;
  /** Objectifs qui attendent ma réponse (ou celle d'un profil de mon compte). */
  pendingGoals: number;
  unseenEncouragements: number;
};

export type FamilyMember = {
  userId: string;
  displayName: string;
  avatar: string | null;
  isChild: boolean;
  /** Abonnement « Soutien » sur son compte : badge à côté du nom (absent sur un serveur plus ancien). */
  supporter?: boolean;
  role: FamilyRole;
  sharing: FamilySharing;
  joinedAt: string;
  isMe: boolean;
  /** Moi ou un profil de mon compte : je règle son partage et réponds pour lui. */
  isMine: boolean;
  statsVisible: boolean;
};

export type FamilyGoalParticipant = {
  userId: string;
  status: GoalParticipantStatus;
  /** null : en attente, refusé, ou progression non partagée. */
  value: number | null;
  done: boolean | null;
  canRespond: boolean;
};

export type FamilyGoal = {
  id: string;
  title: string | null;
  metric: GoalMetric;
  target: number;
  period: GoalPeriod;
  scope: GoalScope;
  createdBy: string | null;
  startsOn: string;
  range: { start: string; end: string };
  canEdit: boolean;
  participants: FamilyGoalParticipant[];
  /** Objectif commun seulement. */
  total: number | null;
  done: boolean | null;
};

export type FamilyEncouragement = {
  id: string;
  fromUserId: string;
  toUserId: string;
  kind: EncouragementKind;
  goalId: string | null;
  createdAt: string;
  seen: boolean;
};

export type FamilyDetail = {
  id: string;
  name: string;
  myRole: FamilyRole;
  mySharing: FamilySharing;
  isChild: boolean;
  inviteCode: { code: string; expiresAt: string } | null;
  members: FamilyMember[];
  goals: FamilyGoal[];
  encouragements: FamilyEncouragement[];
  unseenEncouragements: number;
};

export type FamilyInvitation = {
  id: string;
  email: string;
  createdAt: string;
  expiresAt: string;
};
export type FamilyJoinPreview = {
  familyId: string;
  familyName: string;
  inviterName: string | null;
  membersCount: number;
  alreadyMember: boolean;
};
export type FamilyMemberStats = {
  userId: string;
  displayName: string;
  xp: number;
  currentStreak: number;
  longestStreak: number;
  wordsLearned: number;
  versesMemorized: number;
  versesSolid: number;
  weeks: { weekStart: string; activeDays: number }[];
};
/** Invitation adressée à l'e-mail de mon compte, visible sans ouvrir l'e-mail. */
export type FamilyReceivedInvitation = {
  id: string;
  familyId: string;
  familyName: string;
  inviterName: string | null;
  expiresAt: string;
};

// --- Missions parent → enfant (backend : docs/missions-v1.md) ----------------

export type MissionStep = "listen" | "repeat" | "memorize" | "play";
export type MissionStatus = "active" | "paused" | "finished" | "archived";
export type MissionRange = { chapterId: number; fromVerse: number; toVerse: number };

export type MissionPlan = {
  id: string;
  childId: string;
  authorName: string | null;
  title: string | null;
  ranges: MissionRange[];
  totalVerses: number;
  versesPerDay: number;
  /** 1 = lundi … 7 = dimanche. */
  weekdays: number[];
  steps: MissionStep[];
  messageText: string | null;
  messageAudioId: string | null;
  messageUpdatedAt: string;
  status: MissionStatus;
  startsOn: string;
  totalDays: number;
  completedDays: number;
  createdAt: string;
};

export type MissionDay = { dayIndex: number; verses: string[]; stepsDone: MissionStep[]; stars: number; completedOn: string | null };
export type MissionPlanDetail = MissionPlan & { days: MissionDay[] };

/** Mission du jour d'un enfant, telle que le calendrier du serveur la calcule. */
export type MissionToday =
  | { kind: "mission"; dayIndex: number; verses: string[]; completed: boolean }
  | { kind: "none"; reason: "paused" | "not_started" | "rest_day" | "finished"; nextMissionOn: string | null };

export type MissionChild = {
  id: string;
  displayName: string;
  avatar: string | null;
  plan: (MissionPlan & { today: MissionToday }) | null;
  stars: { total: number; last7Days: number };
};

export type VerseNote = { authorName: string | null; text: string | null; audioId: string | null };

/** Mission du jour vue par l'enfant (GET /me/missions/today). */
export type KidMission = {
  planId: string;
  dayIndex: number;
  totalDays: number;
  title: string | null;
  verses: string[];
  /** Versets du dernier jour terminé, à réécouter avant ceux du jour (vide le premier jour). */
  review: string[];
  steps: { kind: MissionStep; done: boolean }[];
  stars: number;
  completed: boolean;
  message: { authorName: string | null; text: string | null; audioId: string | null; updatedAt: string } | null;
  notes: Record<string, VerseNote>;
};

export type KidToday = {
  mission: KidMission | null;
  reason: null | "no_plan" | "paused" | "not_started" | "rest_day" | "finished";
  nextMissionOn: string | null;
  totalStars: number;
};

/** « Mes mots » : mots réussis au moins une fois ; `known` dit s'ils sont sus en ce moment. */
export type LearnedWord = VocabWord & { learnedAt: string; known: boolean };
