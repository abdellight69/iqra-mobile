import { useQuery } from "@tanstack/react-query";
import type { Href } from "expo-router";
import { api, ApiError } from "./api";
import type { Goal } from "./types";

/**
 * Plan personnel : l'objectif choisi au premier lancement, une cible fixe et sa progression, et la
 * séance du jour qui réunit mots, versets, lettres et lecture (`GET /me/plan`). L'accueil n'affiche
 * plus qu'une chose à faire : la prochaine étape non faite.
 */
export type Plan = {
  goal: Goal | null;
  target: { id: string; title: string; detail: string; done: number; total: number; unit: "mots" | "versets" | "jours" };
  today: {
    words: { due: number; new: number };
    verses: { due: number };
    letters: { lessonId: string | null; title: string | null };
    reading: { programId: string; day: number; dayCount: number } | null;
    done: { words: boolean; verses: boolean; letters: boolean; reading: boolean };
    estimatedMinutes: number;
  };
  milestones: { label: string; done: boolean }[];
};

export type PlanStepKind = "words" | "verses" | "letters" | "reading";
export type PlanStep = { kind: PlanStepKind; title: string; detail: string; minutes: number; done: boolean; href: Href };

export const planKey = ["me-plan"] as const;

/** Le plan du profil ; `null` quand le serveur ne le connaît pas (version plus ancienne). */
export function usePlan(enabled = true) {
  return useQuery({
    queryKey: planKey,
    queryFn: async (): Promise<Plan | null> => {
      try {
        return await api<Plan>("/me/plan");
      } catch (error) {
        if (error instanceof ApiError && error.status === 404) return null;
        throw error;
      }
    },
    enabled,
    staleTime: 60_000,
  });
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/**
 * Les étapes de la séance du jour, dans l'ordre où on les fait : les mots (la séance du jour du
 * vocabulaire), les versets à réciter, la leçon de lecture, puis le jour du programme de lecture.
 * Une étape sans rien à faire n'apparaît pas.
 */
export function planSteps(plan: Plan): PlanStep[] {
  const t = plan.today;
  const steps: PlanStep[] = [];
  const wordCount = t.words.due + t.words.new;
  if (wordCount > 0 || t.done.words) {
    steps.push({
      kind: "words",
      title: "Les mots du jour",
      detail: t.done.words ? "Fait" : [t.words.new > 0 ? plural(t.words.new, "mot nouveau", "mots nouveaux") : null, t.words.due > 0 ? plural(t.words.due, "révision", "révisions") : null].filter(Boolean).join(" · "),
      minutes: Math.max(2, Math.ceil(wordCount * 0.5)),
      done: t.done.words,
      href: { pathname: "/learn/session", params: { daily: "1" } },
    });
  }
  if (t.verses.due > 0 || t.done.verses) {
    steps.push({
      kind: "verses",
      title: "Réciter",
      detail: t.done.verses ? "Fait" : plural(t.verses.due, "verset à réviser", "versets à réviser"),
      minutes: Math.max(2, t.verses.due * 1.5),
      done: t.done.verses,
      href: { pathname: "/memorize/session", params: { due: "1" } },
    });
  }
  if (t.letters.lessonId) {
    steps.push({
      kind: "letters",
      title: "Apprendre à lire",
      detail: t.done.letters ? "Fait" : (t.letters.title ?? "Prochaine leçon"),
      minutes: 4,
      done: t.done.letters,
      href: { pathname: "/reading/session", params: { lessonId: t.letters.lessonId } },
    });
  }
  if (t.reading) {
    steps.push({
      kind: "reading",
      title: "Lire",
      detail: t.done.reading ? "Fait" : `Jour ${t.reading.day} sur ${t.reading.dayCount}`,
      minutes: 10,
      done: t.done.reading,
      href: { pathname: "/programs/[id]", params: { id: t.reading.programId } },
    });
  }
  return steps;
}

/** Première étape non faite ; `null` quand la séance du jour est finie (ou vide). */
export function nextPlanStep(plan: Plan): PlanStep | null {
  return planSteps(plan).find((s) => !s.done) ?? null;
}

/** Minutes restantes aujourd'hui, arrondies, d'après les étapes non faites. */
export function remainingMinutes(plan: Plan): number {
  return Math.round(planSteps(plan).filter((s) => !s.done).reduce((sum, s) => sum + s.minutes, 0));
}

/** « 120 mots sur 310 » ; « 3 jours sur 30 ». */
export function progressLabel(target: Plan["target"]): string {
  return `${target.done} ${target.unit} sur ${target.total}`;
}

/** Part accomplie de la cible, entre 0 et 1. */
export function progressRatio(target: Plan["target"]): number {
  if (target.total <= 0) return 0;
  return Math.max(0, Math.min(1, target.done / target.total));
}

/** Le premier jalon non atteint, pour dire vers quoi on avance. */
export function nextMilestone(plan: Plan): string | null {
  return plan.milestones.find((m) => !m.done)?.label ?? null;
}
