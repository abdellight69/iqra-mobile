import { Platform } from "react-native";
import type { ReadingPosition, Stats, User } from "./types";
import { writeSnapshotCache } from "./widget-cache";

/**
 * Widgets d'écran d'accueil (iOS : WidgetKit, Android : AppWidget). L'app leur laisse un petit
 * instantané à chaque mise à jour des statistiques : XP du jour face à l'objectif, série,
 * révisions dues, position de lecture. Le widget lit cet instantané ; il ne parle jamais au
 * serveur. Un toucher ouvre l'app sur la page correspondante (lien profond `iqra://`).
 */
export type WidgetSnapshot = {
  displayName: string;
  todayXp: number;
  goalXp: number;
  currentStreak: number;
  dueVerses: number;
  dueWords: number;
  resumeChapterId: number | null;
  resumeChapterName: string | null;
  resumeVerse: number | null;
  updatedAt: string;
};

/** Groupe d'applications iOS partagé entre l'app et le widget (voir targets/widget). */
export const APP_GROUP = "group.app.iqra.mobile";
export const ANDROID_WIDGET_NAME = "IqraToday";
const KEY = "snapshot";

export function buildSnapshot(input: {
  user: User;
  stats: Stats;
  position: ReadingPosition | undefined;
  chapterName: string | null;
}): WidgetSnapshot {
  return {
    displayName: input.user.displayName,
    todayXp: input.stats.today.xp,
    goalXp: input.stats.today.goalXp,
    currentStreak: input.stats.currentStreak,
    dueVerses: input.stats.memorization.due,
    dueWords: input.stats.vocabulary.due,
    resumeChapterId: input.position?.chapterId ?? null,
    resumeChapterName: input.chapterName,
    resumeVerse: input.position?.verseNumber ?? null,
    updatedAt: new Date().toISOString(),
  };
}

/** Écrit l'instantané pour le widget et demande son rafraîchissement. Sans effet sur le web. */
export async function publishWidgetSnapshot(snapshot: WidgetSnapshot | null): Promise<void> {
  writeSnapshotCache(snapshot);
  try {
    if (Platform.OS === "ios") {
      const { ExtensionStorage } = await import("@bacons/apple-targets");
      const storage = new ExtensionStorage(APP_GROUP);
      if (snapshot) storage.set(KEY, JSON.stringify(snapshot));
      else storage.remove(KEY);
      ExtensionStorage.reloadWidget();
    } else if (Platform.OS === "android") {
      const { requestWidgetUpdate } = await import("react-native-android-widget");
      const { renderTodayWidget } = await import("../widgets/TodayWidget");
      await requestWidgetUpdate({ widgetName: ANDROID_WIDGET_NAME, renderWidget: () => renderTodayWidget(snapshot) });
    }
  } catch {
    // Widget absent (Expo Go, ancienne compilation) : l'app continue sans.
  }
}
