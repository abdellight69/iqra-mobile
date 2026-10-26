import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "./api";

/**
 * La semaine (du lundi au dimanche) : jours pratiqués, totaux, comparaison avec la semaine
 * d'avant et objectif de jours actifs (`GET /me/week`, `PUT /me/week-goal`). Sert au bilan du
 * dimanche, à la carte « Cette semaine » de l'accueil et aux rappels.
 */
export type WeekDay = {
  day: string;
  xp: number;
  wordsReviewed: number;
  versesReviewed: number;
  versesRead: number;
  wordsLearned: number;
  versesLearned: number;
  practiced: boolean;
  frozen: boolean;
};
export type WeekTotals = { xp: number; activeDays: number; wordsLearned: number; versesLearned: number; versesRead: number; wordsReviewed?: number; versesReviewed?: number };
export type Week = {
  weekStart: string;
  weekEnd: string;
  goalActiveDays: number;
  days: WeekDay[];
  totals: WeekTotals;
  previous: WeekTotals;
  streak: number;
  goalReached: boolean;
};

export const weekKey = (offset: number) => ["week", offset] as const;

/** La semaine en cours (`offset` 0) ou une précédente ; `null` si le serveur ne la connaît pas. */
export function useWeek(offset = 0, enabled = true) {
  return useQuery({
    queryKey: weekKey(offset),
    queryFn: async (): Promise<Week | null> => {
      try {
        return await api<Week>(`/me/week${offset ? `?offset=${offset}` : ""}`);
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    enabled,
    staleTime: 60_000,
  });
}

export function useSetWeekGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (activeDays: number) => api<{ weeklyGoalDays: number }>("/me/week-goal", { method: "PUT", body: { activeDays } }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["week"] });
      void client.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export const WEEK_GOAL_CHOICES = [3, 4, 5, 6, 7] as const;

/** Lettres des jours, du lundi au dimanche. */
export const DAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"] as const;

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** « Semaine du 19 au 25 octobre » (même mois) ou « du 28 octobre au 3 novembre ». */
export function weekLabel(weekStart: string, weekEnd: string): string {
  const start = new Date(`${weekStart}T12:00:00`);
  const end = new Date(`${weekEnd}T12:00:00`);
  const month = (d: Date) => new Intl.DateTimeFormat("fr-FR", { month: "long" }).format(d);
  if (start.getMonth() === end.getMonth()) return `Semaine du ${start.getDate()} au ${end.getDate()} ${month(end)}`;
  return `Semaine du ${start.getDate()} ${month(start)} au ${end.getDate()} ${month(end)}`;
}

/** Titre du bilan : « 5 jours sur 7, objectif atteint » / « 3 jours sur 7, objectif : 5 ». */
export function weekHeadline(week: Week): string {
  const days = `${plural(week.totals.activeDays, "jour", "jours")} sur 7`;
  return week.goalReached ? `${days}, objectif atteint` : `${days}, objectif : ${week.goalActiveDays}`;
}

/** Ce qui a été appris cette semaine, en une phrase ; vide si rien. */
export function weekSummary(totals: WeekTotals): string {
  const parts: string[] = [];
  if (totals.wordsLearned > 0) parts.push(plural(totals.wordsLearned, "mot appris", "mots appris"));
  if (totals.versesLearned > 0) parts.push(plural(totals.versesLearned, "verset mémorisé", "versets mémorisés"));
  if (totals.versesRead > 0) parts.push(plural(totals.versesRead, "verset lu", "versets lus"));
  if (parts.length === 0 && totals.xp > 0) parts.push(`${totals.xp} XP`);
  return parts.join(" · ");
}

export type WeekComparison = { label: string; current: number; previous: number; trend: "up" | "down" | "same" };

/** Comparaison avec la semaine d'avant, pour les quatre chiffres qui comptent. */
export function compareWeeks(totals: WeekTotals, previous: WeekTotals): WeekComparison[] {
  const row = (label: string, current: number, prev: number): WeekComparison => ({
    label,
    current,
    previous: prev,
    trend: current > prev ? "up" : current < prev ? "down" : "same",
  });
  return [
    row("Jours pratiqués", totals.activeDays, previous.activeDays),
    row("XP", totals.xp, previous.xp),
    row("Mots appris", totals.wordsLearned, previous.wordsLearned),
    row("Versets mémorisés", totals.versesLearned, previous.versesLearned),
  ];
}

/** Un mot d'encouragement honnête, selon la semaine. */
export function weekMessage(week: Week, todayIndex: number): string {
  const left = 6 - todayIndex;
  const missing = week.goalActiveDays - week.totals.activeDays;
  if (week.goalReached) return "Objectif de la semaine atteint. Continuez à votre rythme.";
  if (missing <= left) return `Encore ${plural(missing, "jour", "jours")} de pratique pour atteindre votre objectif, il reste ${plural(left + 1, "jour", "jours")}.`;
  return "L'objectif ne sera pas atteint cette semaine : ce n'est pas grave, la semaine prochaine repart de zéro.";
}

/** Index du jour local dans la semaine (0 = lundi … 6 = dimanche). */
export function weekdayIndex(date: Date): number {
  return (date.getDay() + 6) % 7;
}
