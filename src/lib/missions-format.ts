import type Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import type { Chapter, MissionRange, MissionStep, MissionToday } from "./types";

type Icon = ComponentProps<typeof Ionicons>["name"];

/** Étapes d'une mission, dans l'ordre où l'enfant les fait (docs/missions-v1.md, §5). */
export const STEPS: { kind: MissionStep; title: string; hint: string; icon: Icon }[] = [
  { kind: "listen", title: "Écouter le verset", hint: "Avec la voix du récitateur, mot par mot", icon: "headset-outline" },
  { kind: "repeat", title: "Le répéter à voix haute", hint: "Eqra vérifie la récitation, sans jamais bloquer", icon: "mic-outline" },
  { kind: "memorize", title: "L’apprendre par cœur", hint: "Courte séance, plus les révisions des jours passés", icon: "repeat-outline" },
  { kind: "play", title: "Jouer avec les mots", hint: "Les mots rejoignent « Mes mots »", icon: "shapes-outline" },
];

export const WEEKDAYS = [
  { day: 1, short: "L", name: "Lundi" },
  { day: 2, short: "M", name: "Mardi" },
  { day: 3, short: "M", name: "Mercredi" },
  { day: 4, short: "J", name: "Jeudi" },
  { day: 5, short: "V", name: "Vendredi" },
  { day: 6, short: "S", name: "Samedi" },
  { day: 7, short: "D", name: "Dimanche" },
] as const;

/** Sourates courtes proposées en premier pour une mission d'enfant. */
export const SHORT_SURAHS = [1, 112, 113, 114, 108, 103] as const;

/** Versets au plus dans une mission (limite du serveur). */
export const MAX_MISSION_VERSES = 300;

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export function countVerses(ranges: MissionRange[]): number {
  return ranges.reduce((n, r) => n + r.toVerse - r.fromVerse + 1, 0);
}

/** « Sourate Al-Ikhlâs », « Sourate Al-Baqara, versets 1 à 5 », « Sourate An-Nâs et 2 autres ». */
export function planTitle(plan: { title: string | null; ranges: MissionRange[] }, chapters: Chapter[] | undefined): string {
  if (plan.title) return plan.title;
  const [first] = plan.ranges;
  if (!first) return "Mission";
  const chapter = chapters?.find((c) => c.id === first.chapterId);
  const name = `Sourate ${chapter?.nameSimple ?? first.chapterId}`;
  const chapterIds = new Set(plan.ranges.map((r) => r.chapterId));
  if (chapterIds.size > 1) return `${name} et ${plural(chapterIds.size - 1, "autre", "autres")}`;
  const whole = plan.ranges.length === 1 && first.fromVerse === 1 && chapter !== undefined && first.toVerse === chapter.versesCount;
  if (whole || !chapter) return name;
  return first.fromVerse === first.toVerse ? `${name}, verset ${first.fromVerse}` : `${name}, versets ${first.fromVerse} à ${first.toVerse}`;
}

/** Nombre de missions du jour et rythme : « 4 missions · 4 jours par semaine ». */
export function missionSummary(totalVerses: number, versesPerDay: number, weekdays: number[]): string {
  const days = Math.ceil(totalVerses / versesPerDay);
  const rhythm = weekdays.length === 7 ? "tous les jours" : plural(weekdays.length, "jour par semaine", "jours par semaine");
  return `${plural(days, "mission", "missions")} · ${rhythm}`;
}

/** « aujourd’hui », « demain », sinon « jeudi 23 octobre » (jours locaux YYYY-MM-DD). */
export function dayLabel(day: string, today: string): string {
  if (day === today) return "aujourd’hui";
  const tomorrow = new Date(`${today}T12:00:00Z`);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (day === tomorrow.toISOString().slice(0, 10)) return "demain";
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`));
}

/** Où en est l'enfant aujourd'hui, en une ligne, pour le parent. */
export function todayLine(today: MissionToday, totalDays: number, localToday: string): string {
  if (today.kind === "mission") {
    return today.completed ? `Mission du jour réussie (jour ${today.dayIndex} sur ${totalDays})` : `Mission du jour à faire : jour ${today.dayIndex} sur ${totalDays}`;
  }
  const next = today.nextMissionOn ? `, prochaine mission ${dayLabel(today.nextMissionOn, localToday)}` : "";
  switch (today.reason) {
    case "rest_day":
      return `Jour de repos${next}`;
    case "not_started":
      return `Commence ${today.nextMissionOn ? dayLabel(today.nextMissionOn, localToday) : "bientôt"}`;
    case "paused":
      return "En pause";
    case "finished":
      return "Mission terminée";
  }
}

/** Durée d'un vocal : « 0:18 ». */
export function duration(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
