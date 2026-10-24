import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { api, ApiError } from "./api";

/**
 * Activités faites sans réseau, gardées sur l'appareil et envoyées dans l'ordre dès que le serveur
 * répond : auto-évaluations de mémorisation et séances de vocabulaire. Chacune porte sa date
 * (`playedAt`) pour compter le jour où elle a été faite (XP du jour, série).
 */
export type PendingReview = { chapterId: number; verseNumber: number; quality: number; playedAt?: string; clientId?: string };
export type PendingSession = { lessonId?: string; answers: { wordId: string; correct: boolean }[]; playedAt: string; clientId?: string };
/** Étape de mission réussie sans réseau (profil enfant), datée du jour où elle a été faite. */
export type PendingMissionStep = { planId: string; dayIndex: number; step: string; playedAt: string; clientId?: string };

const supported = Platform.OS !== "web";

/**
 * Identifiant d'idempotence : le serveur ignore une activité qu'il a déjà reçue sous cet identifiant.
 * Ainsi une réponse perdue après traitement (coupure juste après l'envoi) ne compte pas deux fois.
 */
export function newClientId(): string {
  const native = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto?.randomUUID;
  if (typeof native === "function") return native.call(globalThis.crypto);
  // UUID v4 de repli, suffisant pour dédoublonner (pas un secret).
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = "4";
  hex[16] = ((parseInt(hex[16]!, 16) & 0x3) | 0x8).toString(16);
  const s = hex.join("");
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}-${s.slice(16, 20)}-${s.slice(20)}`;
}

/** Une file persistée dans un fichier JSON (un tableau), lue et réécrite à chaque opération. */
function fileQueue<T>(name: string) {
  const file = () => new File(Paths.document, name);
  const read = (): T[] => {
    if (!supported) return [];
    try {
      const f = file();
      return f.exists ? (JSON.parse(f.textSync()) as T[]) : [];
    } catch {
      return [];
    }
  };
  const write = (items: T[]) => {
    if (!supported) return;
    const f = file();
    if (items.length === 0) {
      if (f.exists) f.delete();
    } else f.write(JSON.stringify(items));
  };
  return { read, write };
}

type Queue<T> = ReturnType<typeof fileQueue<T>>;

const reviews = fileQueue<PendingReview>("pending-reviews.json");
const sessions = fileQueue<PendingSession>("pending-sessions.json");
const missionSteps = fileQueue<PendingMissionStep>("pending-mission-steps.json");

export function queueReview(review: PendingReview) {
  reviews.write([...reviews.read(), { ...review, playedAt: review.playedAt ?? new Date().toISOString(), clientId: review.clientId ?? newClientId() }]);
}

export function queueSession(session: Omit<PendingSession, "playedAt"> & { playedAt?: string }) {
  sessions.write([...sessions.read(), { ...session, playedAt: session.playedAt ?? new Date().toISOString(), clientId: session.clientId ?? newClientId() }]);
}

export function queueMissionStep(step: Omit<PendingMissionStep, "playedAt"> & { playedAt?: string }) {
  missionSteps.write([...missionSteps.read(), { ...step, playedAt: step.playedAt ?? new Date().toISOString(), clientId: step.clientId ?? newClientId() }]);
}

/** Étapes de mission en attente, dans l'ordre : l'accueil enfant les montre comme déjà réussies. */
export function pendingMissionSteps(): PendingMissionStep[] {
  return missionSteps.read();
}

/** Activités en attente d'envoi (évaluations, séances et étapes de mission). */
export function pendingReviewCount(): number {
  return reviews.read().length + sessions.read().length + missionSteps.read().length;
}

export function pendingSessionCount(): number {
  return sessions.read().length;
}

/** Erreur après laquelle on garde l'activité pour plus tard (réseau, serveur en panne, session expirée). */
const retryLater = (error: unknown) => !(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.status === 401;

/**
 * Envoie une file dans l'ordre ; s'arrête à la première panne. Une activité refusée par le serveur
 * (4xx : mot ou verset retiré, données invalides) est abandonnée : inutile de réessayer.
 */
async function flushQueue<T>(queue: Queue<T>, send: (item: T) => Promise<unknown>): Promise<{ sent: number; blocked: boolean }> {
  let sent = 0;
  for (let pending = queue.read(); pending.length > 0; pending = queue.read()) {
    const next = pending[0] as T;
    try {
      await send(next);
    } catch (error) {
      if (retryLater(error)) return { sent, blocked: true };
    }
    // Relu après l'envoi : une activité ajoutée pendant la requête ne doit pas être écrasée.
    const now = queue.read();
    if (now.length > 0 && JSON.stringify(now[0]) === JSON.stringify(next)) queue.write(now.slice(1));
    sent++;
  }
  return { sent, blocked: false };
}

let flushing: Promise<number> | null = null;

/** Envoie les évaluations puis les séances en attente ; renvoie le nombre envoyé. */
export function flushReviews(): Promise<number> {
  flushing ??= (async () => {
    try {
      const first = await flushQueue(reviews, (body) => api("/memorization/reviews", { method: "POST", body }));
      // Serveur injoignable : inutile d'essayer la seconde file.
      if (first.blocked) return first.sent;
      const second = await flushQueue(sessions, (body) => api("/vocabulary/sessions", { method: "POST", body }));
      if (second.blocked) return first.sent + second.sent;
      const third = await flushQueue(missionSteps, (body) => api("/me/missions/today/steps", { method: "POST", body }));
      return first.sent + second.sent + third.sent;
    } finally {
      flushing = null;
    }
  })();
  return flushing;
}

export function clearOutbox() {
  reviews.write([]);
  sessions.write([]);
  missionSteps.write([]);
}
