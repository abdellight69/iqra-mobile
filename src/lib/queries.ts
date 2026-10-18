import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./api";
import { useAuth } from "./auth-store";
import type {
  Bookmark,
  Chapter,
  ChapterAudio,
  ChapterInfo,
  DueVerse,
  LearningSession,
  LessonDetail,
  LessonSummary,
  MemorizationPlan,
  MemorizationPlanDetail,
  QuranExample,
  ReadingPosition,
  Recitation,
  ReviewResult,
  RootOccurrences,
  SessionResult,
  Stats,
  Translation,
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
  plans: ["plans"] as const,
  plan: (id: string) => ["plan", id] as const,
  due: ["due-verses"] as const,
  bookmarks: ["bookmarks"] as const,
  position: ["reading-position"] as const,
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
    mutationFn: (changes: Partial<Pick<User, "displayName" | "translationId" | "recitationId" | "dailyGoalXp">>) =>
      api<{ user: User }>("/me", { method: "PATCH", body: changes }),
    onSuccess: ({ user }) => {
      setUser(user);
      client.setQueryData(keys.me, user);
      void client.invalidateQueries({ queryKey: ["verses"] });
      void client.invalidateQueries({ queryKey: ["audio"] });
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
    queryFn: async () => (await api<{ chapters: Chapter[] }>("/quran/chapters")).chapters,
    staleTime: DAY,
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
  });
}

export function useChapterAudio(chapterId: number, recitationId: number | null) {
  return useQuery({
    queryKey: keys.audio(chapterId, recitationId),
    queryFn: () => api<ChapterAudio>(`/quran/chapters/${chapterId}/audio${recitationId ? `?recitationId=${recitationId}` : ""}`),
    staleTime: DAY,
  });
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

export function useLearningSession(source: { lessonId: string } | { review: true }) {
  const path = "lessonId" in source ? `/vocabulary/lessons/${source.lessonId}/session` : "/vocabulary/review/session";
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

export function useDueVerses() {
  return useQuery({
    queryKey: keys.due,
    queryFn: async () => (await api<{ verses: DueVerse[] }>("/memorization/due")).verses,
  });
}

export function useReviewVerse() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { chapterId: number; verseNumber: number; quality: number }) =>
      api<ReviewResult>("/memorization/reviews", { method: "POST", body: input }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: keys.plans });
      void client.invalidateQueries({ queryKey: ["plan"] });
      void client.invalidateQueries({ queryKey: keys.due });
      void client.invalidateQueries({ queryKey: keys.stats });
    },
  });
}
