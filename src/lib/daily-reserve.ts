import { File, Paths } from "expo-file-system";
import { Platform } from "react-native";
import type { LearningSession, Verse, WordContext } from "./types";

/**
 * Réserve pour démarrer la séance du jour sans réseau : la séance préparée par le serveur quand
 * la connexion était là, avec les versets et le contexte de ses mots nouveaux. Utilisée une seule
 * fois (consommée à la fin de la séance), renouvelée au retour du réseau.
 */
export type DailyReserve = {
  savedAt: number;
  translationId: number | null;
  session: LearningSession;
  verses: Record<string, Verse>;
  contexts: Record<string, WordContext>;
};

/** Au-delà, la réserve est trop ancienne (révisions dues changées) : on ne la propose plus. */
export const RESERVE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000;
/** En dessous, inutile de la renouveler à chaque retour au premier plan. */
export const RESERVE_REFRESH_MS = 6 * 60 * 60 * 1000;

const supported = Platform.OS !== "web";
const reserveFile = () => new File(Paths.document, "daily-reserve.json");

export function loadDailyReserve(now = Date.now()): DailyReserve | null {
  if (!supported) return null;
  try {
    const file = reserveFile();
    if (!file.exists) return null;
    const reserve = JSON.parse(file.textSync()) as DailyReserve;
    if (!reserve?.session?.exercises?.length || now - reserve.savedAt > RESERVE_MAX_AGE_MS) return null;
    return reserve;
  } catch {
    return null;
  }
}

export function saveDailyReserve(reserve: DailyReserve) {
  if (!supported) return;
  try {
    reserveFile().write(JSON.stringify(reserve));
  } catch {
    // Réserve facultative.
  }
}

/** Une fois la séance faite, la réserve ne doit pas être rejouée. */
export function consumeDailyReserve() {
  if (!supported) return;
  try {
    const file = reserveFile();
    if (file.exists) file.delete();
  } catch {
    // Rien à supprimer.
  }
}

/** Faut-il préparer une nouvelle réserve ? */
export function reserveNeedsRefresh(now = Date.now()): boolean {
  const reserve = loadDailyReserve(now);
  return !reserve || now - reserve.savedAt > RESERVE_REFRESH_MS;
}

/** Versets (sourate:verset) à garder pour une séance : ceux de ses mots nouveaux. */
export function reserveVerseKeys(session: LearningSession): string[] {
  const keys = Object.values(session.verseByWord ?? {}).map((loc) => loc.split(":").slice(0, 2).join(":"));
  return [...new Set(keys)];
}
