import { useQuery } from "@tanstack/react-query";
import { api } from "./api";
import { countVerses } from "./missions-format";
import type { Chapter, MissionRange, MissionStep } from "./types";

/**
 * Fiche « Ce que mon enfant sait » (GET /me/missions/children/:id/insights) et missions prêtes
 * (GET /me/missions/templates), côté parent. Formes exactes du contrat du 24 octobre 2026.
 */

/** Une sourate où l'enfant a au moins un verset suivi en mémorisation. */
export type ChildSurah = {
  chapterId: number;
  versesCount: number;
  /** Versets suivis, versets sus (« solid »), versets récités sans erreur (tous les mots à streak ≥ 2). */
  tracked: number;
  solid: number;
  recitedOk: number;
};

export type ChildRecentWord = { id: string; ar: string; fr: string; learnedAt: string };

/** Mot raté en récitation : emplacement « sourate:verset:mot », verset « sourate:verset ». */
export type ChildWeakWord = { location: string; verseKey: string; text: string; misses: number };

export type ChildDayXp = { day: string; xp: number };

export type ChildInsights = {
  child: { id: string; displayName: string; avatar: string | null };
  surahs: ChildSurah[];
  words: { learned: number; mastered: number; recent: ChildRecentWord[] };
  weakWords: ChildWeakWord[];
  activity: { streak: number; last7Days: ChildDayXp[] };
  missions: { completedDays: number; stars: number; currentTitle: string | null };
};

/** Mission prête à l'emploi : le parent la choisit, l'app crée le plan avec POST /me/missions/plans. */
export type MissionTemplate = {
  id: string;
  title: string;
  description: string;
  ranges: MissionRange[];
  versesPerDay: number;
  /** 1 = lundi … 7 = dimanche. */
  weekdays: number[];
  steps: MissionStep[];
};

export const childInsightsKeys = {
  insights: (childId: string) => ["missions", "insights", childId] as const,
  templates: ["missions", "templates"] as const,
};

export function useChildInsights(childId: string) {
  return useQuery({
    queryKey: childInsightsKeys.insights(childId),
    queryFn: () => api<ChildInsights>(`/me/missions/children/${encodeURIComponent(childId)}/insights`),
    enabled: Boolean(childId),
  });
}

export function useMissionTemplates() {
  return useQuery({
    queryKey: childInsightsKeys.templates,
    queryFn: () => api<MissionTemplate[]>("/me/missions/templates"),
    // Liste statique côté serveur : inutile de la redemander à chaque ouverture du formulaire.
    staleTime: 60 * 60 * 1000,
  });
}

// --- Logique pure (testée dans __tests__/child-insights.test.ts) ----------------------------

/** L'enfant n'a encore rien fait : aucune sourate suivie, aucun mot, aucune mission réussie. */
export function hasStarted(insights: ChildInsights): boolean {
  return (
    insights.surahs.length > 0 ||
    insights.words.learned > 0 ||
    insights.weakWords.length > 0 ||
    insights.missions.completedDays > 0 ||
    insights.activity.last7Days.some((d) => d.xp > 0)
  );
}

export type SurahSummary = {
  chapterId: number;
  name: string;
  solid: number;
  total: number;
  /** Part des versets sus, entre 0 et 1. */
  progress: number;
  /** Tous les versets de la sourate récités sans erreur. */
  recitedOk: boolean;
  /** « 3 versets sur 4, récitée sans erreur ». */
  label: string;
};

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Les sourates de l'enfant, nommées et triées : les plus avancées d'abord (part de versets sus),
 * puis, à égalité, celles récitées sans erreur, puis l'ordre du Coran.
 */
export function summarizeSurahs(surahs: ChildSurah[], chapters: Chapter[] | undefined): SurahSummary[] {
  return surahs
    .map((s) => {
      const chapter = chapters?.find((c) => c.id === s.chapterId);
      const total = s.versesCount > 0 ? s.versesCount : chapter?.versesCount ?? 0;
      const solid = Math.max(0, Math.min(total, s.solid));
      const recitedOk = total > 0 && s.recitedOk >= total;
      const label = `${plural(solid, "verset", "versets")} sur ${total}${recitedOk ? ", récitée sans erreur" : ""}`;
      return { chapterId: s.chapterId, name: chapter?.nameSimple ?? `Sourate ${s.chapterId}`, solid, total, progress: total > 0 ? solid / total : 0, recitedOk, label };
    })
    .sort((a, b) => b.progress - a.progress || Number(b.recitedOk) - Number(a.recitedOk) || a.chapterId - b.chapterId);
}

export type WeekBar = { day: string; letter: string; xp: number; today: boolean };

/** Jours de la semaine en deux lettres, indexés comme Date.getDay() (0 = dimanche). */
const DAY_LETTERS = ["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"] as const;

function shiftDay(day: string, delta: number): string {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
}

/** Les 7 jours jusqu'à aujourd'hui inclus (jours locaux YYYY-MM-DD), avec l'XP du jour (0 si absent). */
export function weekBars(last7Days: ChildDayXp[], today: string): WeekBar[] {
  const xpByDay = new Map(last7Days.map((d) => [d.day, d.xp]));
  return Array.from({ length: 7 }, (_, i) => {
    const day = shiftDay(today, i - 6);
    return { day, letter: DAY_LETTERS[new Date(`${day}T12:00:00Z`).getUTCDay()]!, xp: xpByDay.get(day) ?? 0, today: day === today };
  });
}

/** « Al-Ikhlâs, Al-Falaq, An-Nâs · 15 versets » pour les sourates d'un modèle de mission. */
export function templateSummary(ranges: MissionRange[], chapters: Chapter[] | undefined): string {
  const names = [...new Set(ranges.map((r) => r.chapterId))].map((id) => chapters?.find((c) => c.id === id)?.nameSimple ?? `Sourate ${id}`);
  return `${names.join(", ")} · ${plural(countVerses(ranges), "verset", "versets")}`;
}

/** « Al-Ikhlâs, verset 2 » d'après une clé « 112:2 » ; la sourate seule si la clé est incomplète. */
export function verseReference(verseKey: string, chapters: Chapter[] | undefined): string {
  const [chapterPart, versePart] = verseKey.split(":");
  const chapterId = Number(chapterPart);
  const name = chapters?.find((c) => c.id === chapterId)?.nameSimple ?? `Sourate ${chapterPart}`;
  return versePart ? `${name}, verset ${versePart}` : name;
}

/** Plage d'un seul verset à partir d'une clé « 112:2 », pour en faire une mission ; null si la clé est invalide. */
export function verseRange(verseKey: string): MissionRange | null {
  const [chapterId, verse] = verseKey.split(":").map(Number);
  if (!Number.isInteger(chapterId) || !Number.isInteger(verse) || !chapterId || !verse) return null;
  return { chapterId, fromVerse: verse, toVerse: verse };
}
