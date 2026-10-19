import { type QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";
import { queueReview } from "./outbox";
import { isNetworkError, loadChaptersCache, readOfflineChapter, saveChaptersCache, useOffline } from "./offline";
import { useAuth } from "./auth-store";
import type {
  AlphabetOverview,
  Bookmark,
  Chapter,
  ChapterAudio,
  ChapterComprehension,
  ChapterComprehensionDetail,
  ChapterInfo,
  DueVerse,
  LearningSession,
  LessonDetail,
  LessonSummary,
  MemorizationMap,
  MemorizationPlan,
  MemorizationPlanDetail,
  QuranExample,
  ProgramDetail,
  ReadingResult,
  SearchResults,
  UnifiedSearch,
  ReadingSession,
  ProgramSummary,
  ReadingPosition,
  Recitation,
  ReviewResult,
  RootOccurrences,
  SessionResult,
  Stats,
  TafsirResource,
  Translation,
  VerseTafsir,
  WeakWord,
  User,
  Verse,
  VersePage,
  WordDetails,
} from "./types";

const DAY = 24 * 60 * 60 * 1000;

export const keys = {
  me: ["me"] as const,
  stats: ["stats"] as const,
  chapters: ["chapters"] as const,
  chapterInfo: (id: number) => ["chapter-info", id] as const,
  verses: (id: number, translationId: number | null) => ["verses", id, translationId] as const,
  verse: (key: string, translationId: number | null) => ["verse", key, translationId] as const,
  audio: (id: number, recitationId: number | null) => ["audio", id, recitationId] as const,
  word: (location: string) => ["word", location] as const,
  root: (root: string) => ["root", root] as const,
  translations: ["translations"] as const,
  recitations: ["recitations"] as const,
  lessons: ["lessons"] as const,
  lesson: (id: string) => ["lesson", id] as const,
  example: (wordId: string) => ["vocab-example", wordId] as const,
  comprehension: ["comprehension"] as const,
  programs: ["programs"] as const,
  program: (id: string) => ["program", id] as const,
  chapterComprehension: (id: number) => ["comprehension", id] as const,
  knownWords: (id: number) => ["comprehension", id, "words"] as const,
  plans: ["plans"] as const,
  plan: (id: string) => ["plan", id] as const,
  due: ["due-verses"] as const,
  bookmarks: ["bookmarks"] as const,
  position: ["reading-position"] as const,
  alphabet: ["alphabet"] as const,
};

// --- Compte -----------------------------------------------------------------

export function useMe() {
  const setUser = useAuth((s) => s.setUser);
  return useQuery({
    queryKey: keys.me,
    queryFn: async () => {
      const { user } = await api<{ user: User }>("/me");
      setUser(user);
      return user;
    },
  });
}

export function useUpdateMe() {
  const client = useQueryClient();
  const setUser = useAuth((s) => s.setUser);
  return useMutation({
    mutationFn: (
      changes: Partial<Pick<User, "displayName" | "translationId" | "recitationId" | "tafsirId" | "dailyGoalXp" | "goal" | "arabicLevel">> & {
        onboarded?: true;
      },
    ) =>
      api<{ user: User }>("/me", { method: "PATCH", body: changes }),
    onSuccess: ({ user }) => {
      setUser(user);
      client.setQueryData(keys.me, user);
      void client.invalidateQueries({ queryKey: ["verses"] });
      void client.invalidateQueries({ queryKey: ["audio"] });
      void client.invalidateQueries({ queryKey: ["tafsir"] });
    },
  });
}

export function useStats() {
  return useQuery({ queryKey: keys.stats, queryFn: async () => (await api<{ stats: Stats }>("/me/stats")).stats });
}

// --- Coran ------------------------------------------------------------------

export function useChapters() {
  return useQuery({
    queryKey: keys.chapters,
    queryFn: async () => {
      try {
        const chapters = (await api<{ chapters: Chapter[] }>("/quran/chapters")).chapters;
        saveChaptersCache(chapters);
        return chapters;
      } catch (error) {
        // Sans réseau : la liste gardée sur l'appareil.
        const cached = isNetworkError(error) ? loadChaptersCache() : null;
        if (cached) return cached;
        throw error;
      }
    },
    staleTime: DAY,
  });
}

/** Copie téléchargée d'une sourate (null si elle n'a pas été téléchargée). */
export function useOfflineChapter(chapterId: number) {
  const downloadedAt = useOffline((s) => s.entries[chapterId]?.downloadedAt ?? null);
  return useQuery({
    queryKey: ["offline", chapterId, downloadedAt],
    queryFn: () => (downloadedAt ? readOfflineChapter(chapterId) : null),
    staleTime: Infinity,
    networkMode: "always",
  });
}

export function useChapter(id: number) {
  const chapters = useChapters();
  return { ...chapters, data: chapters.data?.find((c) => c.id === id) };
}

export function useChapterInfo(id: number) {
  return useQuery({
    queryKey: keys.chapterInfo(id),
    queryFn: async () => (await api<{ info: ChapterInfo }>(`/quran/chapters/${id}/info`)).info,
    staleTime: DAY,
  });
}

export function useVerses(chapterId: number, translationId: number | null) {
  return useInfiniteQuery({
    queryKey: keys.verses(chapterId, translationId),
    initialPageParam: 1,
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({ page: String(pageParam), perPage: "20" });
      if (translationId) query.set("translationId", String(translationId));
      return api<VersePage>(`/quran/chapters/${chapterId}/verses?${query}`);
    },
    getNextPageParam: (last) => (last.pagination.page < last.pagination.totalPages ? last.pagination.page + 1 : undefined),
    staleTime: DAY,
  });
}

export function useVerse(key: string, translationId: number | null) {
  return useQuery({
    queryKey: keys.verse(key, translationId),
    queryFn: async () => {
      const query = translationId ? `?translationId=${translationId}` : "";
      return (await api<{ verse: Verse }>(`/quran/verses/${key}${query}`)).verse;
    },
    staleTime: DAY,
    enabled: Boolean(key),
  });
}

const chapterAudioQuery = (chapterId: number, recitationId: number | null) => ({
  queryKey: keys.audio(chapterId, recitationId),
  queryFn: () => api<ChapterAudio>(`/quran/chapters/${chapterId}/audio${recitationId ? `?recitationId=${recitationId}` : ""}`),
  staleTime: DAY,
});

export function useChapterAudio(chapterId: number, recitationId: number | null) {
  return useQuery(chapterAudioQuery(chapterId, recitationId));
}

/** Audio d'une sourate chargé à la demande (bouton ▶ d'un résultat de recherche), via le même cache que `useChapterAudio`. */
export function fetchChapterAudio(client: QueryClient, chapterId: number, recitationId: number | null) {
  return client.fetchQuery(chapterAudioQuery(chapterId, recitationId));
}

export function useWordDetails(location: string) {
  return useQuery({
    queryKey: keys.word(location),
    queryFn: () => api<WordDetails>(`/quran/words/${location}`),
    staleTime: DAY,
  });
}

export function useRootOccurrences(root: string | null) {
  return useQuery({
    queryKey: keys.root(root ?? ""),
    queryFn: () => api<RootOccurrences>(`/quran/roots/${encodeURIComponent(root ?? "")}/occurrences?perPage=50`),
    enabled: Boolean(root),
    staleTime: DAY,
  });
}

export function useTranslations() {
  return useQuery({
    queryKey: keys.translations,
    queryFn: async () => (await api<{ translations: Translation[] }>("/quran/resources/translations")).translations,
    staleTime: DAY,
  });
}

export function useTafsirs() {
  return useQuery({
    queryKey: ["tafsirs"],
    queryFn: async () => (await api<{ tafsirs: TafsirResource[] }>("/quran/resources/tafsirs")).tafsirs,
    staleTime: DAY,
  });
}

export function useVerseTafsir(verseKey: string, tafsirId: number | null) {
  return useQuery({
    queryKey: ["tafsir", verseKey, tafsirId],
    queryFn: () => api<VerseTafsir>(`/quran/verses/${verseKey}/tafsir${tafsirId ? `?tafsirId=${tafsirId}` : ""}`),
    staleTime: DAY,
  });
}

/** Le serveur sait-il vérifier une récitation ? (faux sur un serveur sans service de transcription ou plus ancien) */
export function useRecitationAvailable() {
  return useQuery({
    queryKey: ["recitation-status"],
    queryFn: async () => {
      try {
        return (await api<{ available: boolean }>("/recitation/status")).available;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return false;
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useResourceDefaults() {
  return useQuery({
    queryKey: ["resource-defaults"],
    queryFn: () => api<{ translationId: number | null; recitationId: number | null }>("/quran/resources/defaults"),
    staleTime: DAY,
  });
}

export function useRecitations() {
  return useQuery({
    queryKey: keys.recitations,
    queryFn: async () => (await api<{ recitations: Recitation[] }>("/quran/resources/recitations")).recitations,
    staleTime: DAY,
  });
}

// --- Lecture ----------------------------------------------------------------

export function useReadingPosition() {
  return useQuery({
    queryKey: keys.position,
    queryFn: async () => (await api<{ position: ReadingPosition }>("/reading/position")).position,
  });
}

export function useSaveReadingPosition() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (position: { chapterId: number; verseNumber: number }) =>
      api<void>("/reading/position", { method: "PUT", body: position }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.position }),
  });
}

export function useRecordReading() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (versesRead: number) => api<void>("/reading/progress", { method: "POST", body: { versesRead } }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.stats }),
  });
}

export function useBookmarks() {
  return useQuery({
    queryKey: keys.bookmarks,
    queryFn: async () => (await api<{ bookmarks: Bookmark[] }>("/reading/bookmarks")).bookmarks,
  });
}

export function useToggleBookmark() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { chapterId: number; verseNumber: number; existingId?: string }) => {
      if (input.existingId) await api<void>(`/reading/bookmarks/${input.existingId}`, { method: "DELETE" });
      else await api("/reading/bookmarks", { method: "POST", body: { chapterId: input.chapterId, verseNumber: input.verseNumber } });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: keys.bookmarks }),
  });
}

// --- Vocabulaire ------------------------------------------------------------

export function useLessons() {
  return useQuery({
    queryKey: keys.lessons,
    queryFn: async () => (await api<{ lessons: LessonSummary[] }>("/vocabulary/lessons")).lessons,
  });
}

export function useLesson(id: string) {
  return useQuery({ queryKey: keys.lesson(id), queryFn: () => api<LessonDetail>(`/vocabulary/lessons/${id}`), staleTime: DAY });
}

export function useWordExample(wordId: string) {
  return useQuery({
    queryKey: keys.example(wordId),
    queryFn: async () => (await api<{ example: QuranExample | null }>(`/vocabulary/words/${wordId}/example`)).example,
    staleTime: DAY,
  });
}

export function useComprehension() {
  return useQuery({
    queryKey: keys.comprehension,
    queryFn: async () => (await api<{ chapters: ChapterComprehension[] }>("/vocabulary/comprehension")).chapters,
  });
}

export function useChapterComprehension(chapterId: number) {
  return useQuery({
    queryKey: keys.chapterComprehension(chapterId),
    queryFn: () => api<ChapterComprehensionDetail>(`/vocabulary/comprehension/${chapterId}`),
  });
}

/**
 * Le cache garde la liste reçue (un Set enregistré en JSON devient `{}`) ; le Set est construit à la
 * lecture. Une ancienne copie `{}` donne un Set vide le temps du rechargement.
 */
const toKnownSet = (data: { known?: string[] }) => new Set(Array.isArray(data.known) ? data.known : []);

/** Positions « verset:mot » des mots reconnus d'une sourate, pour les surligner dans le lecteur. */
export function useKnownWords(chapterId: number, enabled: boolean) {
  return useQuery({
    queryKey: keys.knownWords(chapterId),
    queryFn: () => api<{ known: string[] }>(`/vocabulary/comprehension/${chapterId}/words`),
    select: toKnownSet,
    enabled,
  });
}

export function useLearningSession(source: { lessonId: string } | { chapterId: number } | { review: true }) {
  const path =
    "lessonId" in source
      ? `/vocabulary/lessons/${source.lessonId}/session`
      : "chapterId" in source
        ? `/vocabulary/comprehension/${source.chapterId}/session`
        : "/vocabulary/review/session";
  return useQuery({
    queryKey: ["session", path],
    queryFn: () => api<LearningSession>(path),
    staleTime: Infinity,
    gcTime: 0,
  });
}

export function useSubmitSession() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { lessonId?: string; answers: { wordId: string; correct: boolean }[] }) =>
      api<SessionResult>("/vocabulary/sessions", { method: "POST", body: input }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.lessons });
      void client.invalidateQueries({ queryKey: keys.stats });
      void client.invalidateQueries({ queryKey: keys.comprehension });
    },
  });
}

// --- Mémorisation -----------------------------------------------------------

export function usePlans() {
  return useQuery({
    queryKey: keys.plans,
    queryFn: async () => (await api<{ plans: MemorizationPlan[] }>("/memorization/plans")).plans,
  });
}

export function usePlan(id: string) {
  return useQuery({
    queryKey: keys.plan(id),
    queryFn: async () => (await api<{ plan: MemorizationPlanDetail }>(`/memorization/plans/${id}`)).plan,
    enabled: Boolean(id),
  });
}

export function useCreatePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { chapterId: number; fromVerse?: number; toVerse?: number }) =>
      api<{ plan: MemorizationPlan }>("/memorization/plans", { method: "POST", body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.plans }),
  });
}

export function useDeletePlan() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/memorization/plans/${id}`, { method: "DELETE" }),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.plans }),
  });
}

/** Recherche dans le Coran, page après page. */
/** Recherche partout (référence, sourates, versets, mots, leçons), dès le premier caractère. */
export function useUnifiedSearch(q: string, translationId: number | null) {
  const query = q.trim();
  return useQuery({
    queryKey: ["unified-search", query, translationId],
    enabled: query.length >= 1,
    queryFn: () => api<UnifiedSearch>(`/search?q=${encodeURIComponent(query)}${translationId ? `&translationId=${translationId}` : ""}`),
    // Court : un résultat vide dû à un fournisseur indisponible ne doit pas rester une heure.
    staleTime: 5 * 60 * 1000,
    placeholderData: (previous) => previous,
  });
}

export function useQuranSearch(q: string, wholeWord: boolean, translationId: number | null) {
  const query = q.trim();
  return useInfiniteQuery({
    queryKey: ["search", query, wholeWord, translationId],
    enabled: query.length >= 2,
    initialPageParam: 1,
    queryFn: ({ pageParam }) =>
      api<SearchResults>(
        `/quran/search?q=${encodeURIComponent(query)}&page=${pageParam}&wholeWord=${wholeWord ? 1 : 0}${translationId ? `&translationId=${translationId}` : ""}`,
      ),
    getNextPageParam: (last) => (last.page * last.pageSize < last.total ? last.page + 1 : undefined),
    staleTime: 60 * 60 * 1000,
  });
}

/** Mots souvent oubliés à la vérification vocale (vide sur un serveur sans cette fonction). */
export function useWeakWords(enabled = true) {
  return useQuery({
    queryKey: ["weak-words"],
    enabled,
    queryFn: async () => {
      try {
        return (await api<{ words: WeakWord[] }>("/recitation/weak-words")).words;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return [];
        throw error;
      }
    },
  });
}

export function useMemorizationMap() {
  return useQuery({ queryKey: ["memorization-map"], queryFn: () => api<MemorizationMap>("/memorization/map") });
}

export function useDueVerses() {
  return useQuery({
    queryKey: keys.due,
    queryFn: async () => (await api<{ verses: DueVerse[] }>("/memorization/due")).verses,
  });
}

export function useReviewVerse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { chapterId: number; verseNumber: number; quality: number }): Promise<ReviewResult & { queued?: boolean }> => {
      try {
        return await api<ReviewResult>("/memorization/reviews", { method: "POST", body: input });
      } catch (error) {
        if (!isNetworkError(error)) throw error;
        // Sans réseau : l'évaluation sera envoyée à la reconnexion.
        queueReview(input);
        return { key: `${input.chapterId}:${input.verseNumber}`, status: "learning", dueAt: "", intervalDays: 0, xpGained: 0, queued: true };
      }
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.plans });
      void client.invalidateQueries({ queryKey: ["plan"] });
      void client.invalidateQueries({ queryKey: keys.due });
      void client.invalidateQueries({ queryKey: keys.stats });
      void client.invalidateQueries({ queryKey: ["memorization-map"] });
    },
  });
}

// --- Programmes guidés --------------------------------------------------------

export function usePrograms() {
  return useQuery({
    queryKey: keys.programs,
    queryFn: async () => (await api<{ programs: ProgramSummary[] }>("/programs")).programs,
  });
}

export function useProgram(id: string) {
  return useQuery({
    queryKey: keys.program(id),
    queryFn: async () => (await api<{ program: ProgramDetail }>(`/programs/${id}`)).program,
  });
}

/** Commencer (ou recommencer), valider un jour ou abandonner un programme. */
export function useProgramAction(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (action: { type: "start" } | { type: "complete"; day: number } | { type: "quit" }) => {
      if (action.type === "quit") return api<void>(`/programs/${id}`, { method: "DELETE" });
      const path = action.type === "start" ? `/programs/${id}/start` : `/programs/${id}/days/${action.day}/complete`;
      return api<{ program: ProgramDetail }>(path, { method: "POST" });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.programs });
      void client.invalidateQueries({ queryKey: keys.program(id) });
    },
  });
}

// --- Apprendre à lire -----------------------------------------------------------

export function useAlphabet() {
  return useQuery({ queryKey: keys.alphabet, queryFn: () => api<AlphabetOverview>("/alphabet") });
}

/** Séance générée à chaque ouverture (exercices tirés au hasard) : jamais réutilisée depuis le cache. */
export function useReadingSession(lessonId: string) {
  return useQuery({
    queryKey: ["reading-session", lessonId],
    queryFn: () => api<ReadingSession>(`/alphabet/lessons/${lessonId}/session`),
    staleTime: 0,
    gcTime: 0,
  });
}

export function useCompleteReadingLesson(lessonId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { correct: number; total: number }) =>
      api<ReadingResult>(`/alphabet/lessons/${lessonId}/complete`, { method: "POST", body: input }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.alphabet });
      void client.invalidateQueries({ queryKey: keys.stats });
    },
  });
}
