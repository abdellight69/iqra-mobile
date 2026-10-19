import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import { api, ApiError } from "./api";

/**
 * Auto-évaluations de mémorisation faites sans réseau : gardées sur l'appareil et envoyées
 * dans l'ordre dès que le serveur répond.
 */
export type PendingReview = { chapterId: number; verseNumber: number; quality: number };

const supported = Platform.OS !== "web";
const outboxFile = () => new File(Paths.document, "pending-reviews.json");

function read(): PendingReview[] {
  if (!supported) return [];
  try {
    const file = outboxFile();
    return file.exists ? (JSON.parse(file.textSync()) as PendingReview[]) : [];
  } catch {
    return [];
  }
}

function write(reviews: PendingReview[]) {
  if (!supported) return;
  const file = outboxFile();
  if (reviews.length === 0) {
    if (file.exists) file.delete();
  } else file.write(JSON.stringify(reviews));
}

export function queueReview(review: PendingReview) {
  write([...read(), review]);
}

export function pendingReviewCount(): number {
  return read().length;
}

let flushing: Promise<number> | null = null;

/** Envoie les évaluations en attente ; renvoie le nombre envoyé. S'arrête au premier échec réseau. */
export function flushReviews(): Promise<number> {
  flushing ??= (async () => {
    let sent = 0;
    try {
      for (let pending = read(); pending.length > 0; pending = read()) {
        const next = pending[0] as PendingReview;
        try {
          await api("/memorization/reviews", { method: "POST", body: next });
        } catch (error) {
          // Refus du serveur (verset retiré, données invalides) : inutile de réessayer.
          if (!(error instanceof ApiError) || error.status === 0 || error.status >= 500 || error.status === 401) break;
        }
        // Relu après l'envoi : une évaluation ajoutée pendant la requête ne doit pas être écrasée.
        const now = read();
        const first = now[0];
        if (first && first.chapterId === next.chapterId && first.verseNumber === next.verseNumber && first.quality === next.quality) {
          write(now.slice(1));
        }
        sent++;
      }
    } finally {
      flushing = null;
    }
    return sent;
  })();
  return flushing;
}

export function clearOutbox() {
  write([]);
}
