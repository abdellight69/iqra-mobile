import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import type { EncouragementKind, FamilyGoal, FamilySharing, GoalMetric, GoalPeriod, GoalScope } from "./types";

type Icon = ComponentProps<typeof Ionicons>["name"];

/** Ce que mesure chaque objectif, exactement comme le serveur le compte (docs/familles-v1.md, §5). */
export const METRICS: Record<GoalMetric, { label: string; one: string; many: string; description: string; icon: Icon }> = {
  verses_read: {
    label: "Versets lus",
    one: "verset lu",
    many: "versets lus",
    description: "Versets affichés dans le lecteur pendant une séance de lecture.",
    icon: "book-outline",
  },
  words_learned: {
    label: "Mots appris",
    one: "mot appris",
    many: "mots appris",
    description: "Mots du vocabulaire réussis pour la première fois.",
    icon: "language-outline",
  },
  verses_learned: {
    label: "Versets mémorisés",
    one: "verset mémorisé",
    many: "versets mémorisés",
    description: "Versets réussis pour la première fois en mémorisation.",
    icon: "repeat-outline",
  },
  reviews: {
    label: "Révisions",
    one: "révision",
    many: "révisions",
    description: "Mots et versets révisés.",
    icon: "refresh-outline",
  },
  active_days: {
    label: "Jours de pratique",
    one: "jour de pratique",
    many: "jours de pratique",
    description: "Jours avec au moins une activité dans l’app.",
    icon: "calendar-outline",
  },
  xp: { label: "XP", one: "XP", many: "XP", description: "Points gagnés en pratiquant.", icon: "flash-outline" },
};

export const METRIC_ORDER: GoalMetric[] = ["verses_read", "words_learned", "verses_learned", "reviews", "active_days", "xp"];

export const PERIODS: Record<GoalPeriod, { every: string; current: string; label: string }> = {
  week: { every: "par semaine", current: "cette semaine", label: "Semaine" },
  month: { every: "par mois", current: "ce mois-ci", label: "Mois" },
};

export const SCOPES: Record<GoalScope, { label: string; description: string }> = {
  each: { label: "Chacun", description: "Chaque membre a sa propre barre." },
  shared: { label: "Ensemble", description: "Une seule barre : tout le monde l’avance." },
  assigned: { label: "Certaines personnes", description: "Seulement pour les personnes choisies." },
};

export const SHARING: Record<FamilySharing, { label: string; description: string }> = {
  none: {
    label: "Rien",
    description: "Les autres voient votre nom, pas votre progression. Elle compte quand même dans un objectif commun.",
  },
  goals: { label: "Mes objectifs", description: "Les autres voient où vous en êtes sur les objectifs de la famille, rien d’autre." },
  all: { label: "Tout", description: "En plus : série, XP, mots appris, versets mémorisés et jours de pratique des 4 dernières semaines." },
};

export const SHARING_ORDER: FamilySharing[] = ["goals", "none", "all"];

export const ENCOURAGEMENTS: Record<EncouragementKind, string> = {
  barakallah: "BârakAllâhou fîk",
  almost: "Continue, tu y es presque",
  mashallah: "MâshâAllâh, objectif atteint",
  count_on_you: "On compte sur toi cette semaine",
};

export const ENCOURAGEMENT_ORDER: EncouragementKind[] = ["barakallah", "almost", "mashallah", "count_on_you"];

/** « 1 verset lu », « 20 mots appris », « 30 XP ». */
export function quantity(metric: GoalMetric, n: number): string {
  const m = METRICS[metric];
  return `${n.toLocaleString("fr-FR")} ${n > 1 ? m.many : m.one}`;
}

/**
 * Titre d’un objectif sans titre libre : « Chacun : 20 mots appris par semaine »,
 * « Ensemble : 200 versets lus par mois », « Amina et Bilal : 5 jours de pratique par semaine ».
 */
export function goalTitle(goal: Pick<FamilyGoal, "title" | "metric" | "target" | "period" | "scope">, assigneeNames: string[] = []): string {
  if (goal.title) return goal.title;
  const who =
    goal.scope === "each"
      ? "Chacun"
      : goal.scope === "shared"
        ? "Ensemble"
        : assigneeNames.length === 1
          ? assigneeNames[0]!
          : assigneeNames.length === 2
            ? `${assigneeNames[0]} et ${assigneeNames[1]}`
            : `${assigneeNames.length} personnes`;
  return `${who} : ${quantity(goal.metric, goal.target)} ${PERIODS[goal.period].every}`;
}

/** Part atteinte, de 0 à 1. */
export function fraction(value: number, target: number): number {
  return target > 0 ? Math.min(1, Math.max(0, value / target)) : 0;
}

/** Jours restants dans la période, aujourd’hui compris (« 2026-10-25 » vu le jeudi 22 → 4). */
export function daysLeft(end: string, today: string): number {
  return Math.max(0, Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000) + 1);
}

export function formatCode(code: string): string {
  const c = normalizeCode(code);
  return c.length === 8 ? `${c.slice(0, 4)}-${c.slice(4)}` : c;
}

export function normalizeCode(code: string): string {
  return code.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Ce qu’on a collé ou saisi pour rejoindre : un lien d’invitation (?t=…), un lien avec code (?c=…)
 * ou un code de 8 caractères. null si rien d’exploitable.
 */
export function parseJoinInput(input: string): { token: string } | { code: string } | null {
  const text = input.trim();
  const token = /[?&]t=([A-Za-z0-9_-]{16,200})/.exec(text)?.[1];
  if (token) return { token };
  const linkCode = /[?&]c=([A-Za-z0-9-]{8,12})/.exec(text)?.[1];
  const code = normalizeCode(linkCode ?? text);
  return code.length === 8 ? { code } : null;
}

/** Date locale du téléphone au format du serveur (« 2026-10-20 »), pour les jours restants. */
export function localDay(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Résumé des familles pour l’Accueil et le Profil : « 2 objectifs en cours · 1 à accepter · 1 encouragement ». */
export function familiesSummary(
  families: { activeGoals: number; pendingGoals: number; unseenEncouragements: number }[],
  invitations = 0,
): string | null {
  const sum = (key: "activeGoals" | "pendingGoals" | "unseenEncouragements") => families.reduce((n, f) => n + f[key], 0);
  const goals = sum("activeGoals");
  const pending = sum("pendingGoals");
  const unseen = sum("unseenEncouragements");
  const parts = [
    invitations > 0 ? `${invitations} invitation${invitations > 1 ? "s" : ""} à rejoindre` : null,
    goals > 0 ? `${goals} objectif${goals > 1 ? "s" : ""} en cours` : null,
    pending > 0 ? `${pending} à accepter` : null,
    unseen > 0 ? `${unseen} encouragement${unseen > 1 ? "s" : ""}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : null;
}
