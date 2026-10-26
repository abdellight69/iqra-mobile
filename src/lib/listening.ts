/**
 * Écoute du Coran : logique pure du lecteur (lecture continue, minuteur de sommeil) et du
 * téléchargement de tout le Coran (estimation, sourates restantes). Sans dépendance native,
 * pour être testée telle quelle.
 */

export const CHAPTER_COUNT = 114;

/** Sourate suivante pour la lecture continue : null après An-Nâs (ou pour un numéro invalide). */
export function nextChapterId(id: number): number | null {
  if (!Number.isInteger(id) || id < 1 || id >= CHAPTER_COUNT) return null;
  return id + 1;
}

/** Durées proposées pour le minuteur de sommeil, en minutes (0 : aucun). */
export const SLEEP_TIMER_CHOICES = [0, 15, 30, 45, 60] as const;
export type SleepTimerMinutes = (typeof SLEEP_TIMER_CHOICES)[number];

export function isSleepTimerMinutes(value: unknown): value is SleepTimerMinutes {
  return typeof value === "number" && (SLEEP_TIMER_CHOICES as readonly number[]).includes(value);
}

/** Échéance du minuteur (ms depuis l'époque) pour une durée choisie ; null sans minuteur. */
export function sleepEndsAt(minutes: number, now: number): number | null {
  return minutes > 0 ? now + minutes * 60_000 : null;
}

/**
 * Temps restant à afficher dans le lecteur (« 23 min », « < 1 min ») ; null sans minuteur
 * ou une fois l'échéance passée. Arrondi vers le haut : à 22 min 10 s, on affiche 23 min.
 */
export function sleepRemaining(endsAt: number | null, now: number): string | null {
  if (endsAt === null || endsAt <= now) return null;
  const minutes = Math.ceil((endsAt - now) / 60_000);
  return minutes <= 1 && endsAt - now < 60_000 ? "< 1 min" : `${minutes} min`;
}

// --- Tout le Coran hors ligne ------------------------------------------------------------------

type DownloadedEntry = { chapterId: number; translationId: number | null; recitationId: number; bytes: number };
type ChapterSize = { id: number; versesCount: number };

/**
 * Estimation des octets restant à télécharger : moyenne par verset des sourates déjà sur
 * l'appareil, multipliée par les versets des sourates absentes. Null sans aucune sourate
 * téléchargée (on affiche alors un ordre de grandeur fixe).
 */
export function estimateRemainingBytes(entries: DownloadedEntry[], chapters: ChapterSize[]): number | null {
  const downloaded = new Map(entries.map((e) => [e.chapterId, e]));
  let bytes = 0;
  let verses = 0;
  let remaining = 0;
  for (const chapter of chapters) {
    const entry = downloaded.get(chapter.id);
    if (entry) {
      bytes += entry.bytes;
      verses += chapter.versesCount;
    } else {
      remaining += chapter.versesCount;
    }
  }
  if (verses === 0 || bytes === 0) return null;
  return Math.round((bytes / verses) * remaining);
}

/** Ordre de grandeur affiché quand aucune sourate ne permet d'estimer. */
export const FULL_QURAN_SIZE_LABEL = "environ 1,5 Go";

/** « 850 Mo » ou « 1,2 Go », pour une estimation (arrondie, sans fausse précision). */
export function formatDownloadSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb < 1000) return `${Math.max(1, Math.round(mb))} Mo`;
  return `${(mb / 1024).toFixed(1).replace(".", ",")} Go`;
}

/**
 * Sourates à télécharger pour « tout le Coran » : celles absentes de l'appareil ou enregistrées
 * avec une autre traduction ou un autre récitateur. `recitationFor` donne le récitateur effectif
 * de chaque sourate (réglage par sourate ou par défaut) ; null signifie « celui du serveur », on
 * garde alors la copie existante quelle que soit sa récitation.
 */
export function chaptersToDownload(
  chapterIds: number[],
  entries: DownloadedEntry[],
  translationId: number | null,
  recitationFor: (chapterId: number) => number | null,
): number[] {
  const downloaded = new Map(entries.map((e) => [e.chapterId, e]));
  return chapterIds.filter((id) => {
    const entry = downloaded.get(id);
    if (!entry) return true;
    const recitationId = recitationFor(id);
    return entry.translationId !== translationId || (recitationId !== null && entry.recitationId !== recitationId);
  });
}

/** Les 114 numéros de sourates, dans l'ordre du Livre. */
export const ALL_CHAPTER_IDS: number[] = Array.from({ length: CHAPTER_COUNT }, (_, i) => i + 1);
