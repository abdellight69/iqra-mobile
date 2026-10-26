/**
 * Planification des rappels locaux, sans dépendance native : à partir des données déjà en cache
 * (objectif du jour, échéances des versets), on calcule les notifications à programmer pour les
 * jours à venir. Elles sont reprogrammées à chaque ouverture de l'app, donc toujours à jour.
 */

export type ReminderTime = { hour: number; minute: number };

export type PlannedReminder = {
  kind: "daily" | "due" | "weekly";
  date: Date;
  title: string;
  body: string;
  /** Lien profond ouvert au toucher de la notification. */
  url: string;
};

/** Liens profonds de l'app (schéma `eqra` dans app.json). */
export const REMINDER_URLS = { home: "eqra://", memorize: "eqra://memorize", week: "eqra://week" } as const;

/**
 * Ce que le serveur sait du moment (`GET /me/reminders/context`) pour que le rappel parle du
 * contenu : la sourate presque finie, la lecture à reprendre, la semaine en cours.
 */
export type ReminderContext = {
  nearlyDone?: { surahName: string; versesLeft: number } | null;
  resume?: { surahName: string; verseNumber: number } | null;
  week?: { activeDays: number; goalActiveDays: number } | null;
};

/** Heure du bilan de la semaine, le dimanche. */
export const WEEKLY_RECAP_TIME: ReminderTime = { hour: 18, minute: 30 };

/** Jours couverts par les rappels programmés à l'avance. */
export const DAYS_AHEAD = 7;
/** Fenêtre horaire des rappels « versets à réviser » : jamais la nuit, une échéance tardive attend le lendemain matin. */
const DUE_EARLIEST_HOUR = 8;
const DUE_LATEST_HOUR = 21;
/** Un rappel d'échéance trop proche du rappel quotidien ferait doublon. */
const MERGE_WINDOW_MS = 60 * 60 * 1000;
/** iOS limite les notifications en attente (64) ; on reste bien en dessous. */
const MAX_REMINDERS = 20;

/** Chemin expo-router correspondant à un lien profond de rappel : `eqra://memorize` → `/memorize`. */
export function reminderPath(url: string): string {
  const path = url.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  return `/${path.replace(/^\/+/, "")}`;
}

export function versesLabel(count: number): string {
  return `${count} verset${count > 1 ? "s" : ""} à réviser`;
}

/**
 * « Plus que 1 verset pour finir Al-Ikhlâs · 12 XP restants » : le contenu d'abord (sourate presque
 * sue, sinon versets à réviser, sinon lecture à reprendre), puis ce qui reste de l'objectif.
 */
export function dailyBody(input: { dueVerses: number; xpRemaining: number }, context?: ReminderContext): string {
  const parts: string[] = [];
  const nearly = context?.nearlyDone;
  if (nearly && nearly.versesLeft > 0) parts.push(`Plus que ${nearly.versesLeft} verset${nearly.versesLeft > 1 ? "s" : ""} pour finir ${nearly.surahName}`);
  else if (input.dueVerses > 0) parts.push(versesLabel(input.dueVerses));
  else if (context?.resume) parts.push(`Reprendre ${context.resume.surahName} au verset ${context.resume.verseNumber}`);
  if (input.xpRemaining > 0) parts.push(`${input.xpRemaining} XP restants`);
  return parts.length > 0 ? parts.join(" · ") : "Quelques minutes avec le Coran aujourd’hui ? Votre série vous attend.";
}

/** Texte du bilan du dimanche : « 5 jours sur 7, objectif atteint » / « 3 jours sur 7 : encore 2 pour l'objectif ». */
export function weeklyBody(week: { activeDays: number; goalActiveDays: number } | null | undefined): string {
  if (!week) return "Votre bilan de la semaine est prêt.";
  const missing = week.goalActiveDays - week.activeDays;
  if (missing <= 0) return `${week.activeDays} jour${week.activeDays > 1 ? "s" : ""} sur 7, objectif atteint. Voir le bilan`;
  return `${week.activeDays} jour${week.activeDays > 1 ? "s" : ""} sur 7 : encore ${missing} pour l’objectif. Voir le bilan`;
}

/** Rappels d'un enfant : « Ta mission t'attend ! » à l'heure choisie, sauf aujourd'hui si c'est fait. */
function kidReminders(now: Date, time: ReminderTime, missionDone: boolean, daysAhead: number): PlannedReminder[] {
  const out: PlannedReminder[] = [];
  for (let offset = 0; offset < daysAhead; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const date = at(day, time);
    if (date.getTime() <= now.getTime()) continue;
    if (offset === 0 && missionDone) continue;
    out.push({ kind: "daily", date, title: "Ta mission t’attend !", body: KID_BODIES[offset % KID_BODIES.length]!, url: REMINDER_URLS.home });
  }
  return out;
}

const KID_BODIES = ["Un petit verset avec Papa ou Maman aujourd’hui ?", "Écoute, répète… et gagne tes étoiles !", "Ta famille t’a préparé une mission. On y va ?"];

function at(day: Date, time: ReminderTime): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), time.hour, time.minute, 0, 0);
}

function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Rappels à programmer pour les prochains jours.
 * - Quotidien : à l'heure choisie, sauf aujourd'hui si l'objectif est déjà atteint ou l'heure passée.
 * - Échéances : quand des versets deviennent à réviser (au plus un par jour, entre 8h et 21h ;
 *   après 21h, le lendemain à 8h), sauf à moins d'une heure du rappel quotidien, qui mentionne déjà le compte.
 * Les comptes de versets sont cumulés : ce qui est dû à cet instant-là, sans révision entre-temps.
 */
export function planReminders(input: {
  now: Date;
  time: ReminderTime;
  today: { xp: number; goalXp: number };
  /** Échéances de tous les versets suivis, passées comme futures. */
  dueAts: Date[];
  daysAhead?: number;
  /** Profil enfant : un seul rappel par jour, celui de sa mission ; rien aujourd'hui si elle est faite. */
  kid?: { missionDone: boolean };
  /** Contenu du moment, pour des rappels qui disent de quoi il s'agit. */
  context?: ReminderContext;
}): PlannedReminder[] {
  const { now, time, today, context } = input;
  const daysAhead = input.daysAhead ?? DAYS_AHEAD;
  if (input.kid) return kidReminders(now, time, input.kid.missionDone, daysAhead);
  const dueAts = [...input.dueAts].sort((a, b) => a.getTime() - b.getTime());
  const dueBefore = (date: Date) => dueAts.filter((d) => d.getTime() <= date.getTime()).length;
  const horizon = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);

  const daily: PlannedReminder[] = [];
  for (let offset = 0; offset < daysAhead; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const date = at(day, time);
    if (date.getTime() <= now.getTime()) continue;
    const goalReached = today.goalXp > 0 && today.xp >= today.goalXp;
    if (offset === 0 && goalReached) continue;
    const xpRemaining = offset === 0 ? Math.max(0, today.goalXp - today.xp) : today.goalXp;
    const dueVerses = dueBefore(date);
    daily.push({
      kind: "daily",
      date,
      title: "Objectif du jour",
      body: dailyBody({ dueVerses, xpRemaining }, context),
      url: dueVerses > 0 ? REMINDER_URLS.memorize : REMINDER_URLS.home,
    });
  }

  // Le dimanche en fin d'après-midi : le bilan de la semaine (une seule fois dans l'horizon).
  const weekly: PlannedReminder[] = [];
  for (let offset = 0; offset < daysAhead; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    if (day.getDay() !== 0) continue;
    const date = at(day, WEEKLY_RECAP_TIME);
    if (date.getTime() <= now.getTime()) continue;
    weekly.push({ kind: "weekly", date, title: "Votre semaine", body: weeklyBody(offset === 0 ? context?.week : null), url: REMINDER_URLS.week });
    break;
  }

  const due: PlannedReminder[] = [];
  const seenDays = new Set<string>();
  for (const dueAt of dueAts) {
    if (dueAt.getTime() <= now.getTime() || dueAt.getTime() > horizon.getTime()) continue;
    let date = dueAt;
    if (date.getHours() < DUE_EARLIEST_HOUR) date = at(date, { hour: DUE_EARLIEST_HOUR, minute: 0 });
    else if (date.getHours() >= DUE_LATEST_HOUR) {
      const nextDay = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
      date = at(nextDay, { hour: DUE_EARLIEST_HOUR, minute: 0 });
    }
    if (date.getTime() <= now.getTime()) continue;
    const key = dayKey(date);
    if (seenDays.has(key)) continue;
    seenDays.add(key);
    const nearDaily = daily.some((d) => Math.abs(d.date.getTime() - date.getTime()) < MERGE_WINDOW_MS);
    if (nearDaily) continue;
    const count = dueBefore(date);
    due.push({ kind: "due", date, title: "Révisions prêtes", body: versesLabel(count), url: REMINDER_URLS.memorize });
  }

  return [...daily, ...due, ...weekly].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, MAX_REMINDERS);
}
