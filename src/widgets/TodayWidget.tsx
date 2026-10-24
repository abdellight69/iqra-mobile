import { FlexWidget, TextWidget } from "react-native-android-widget";
import { lightColors } from "@/lib/palettes";
import type { WidgetSnapshot } from "@/lib/widget";

/** Les couleurs de la palette sont des chaînes ; la bibliothèque du widget attend un `#RRGGBB` typé. */
const hex = (color: string) => color as `#${string}`;

/**
 * Widget Android « Aujourd'hui » : objectif du jour, série, révisions dues, reprise de lecture.
 * Mêmes couleurs que l'app (thème clair ; les widgets Android n'ont pas de thème sombre fiable).
 */
const PAPER = hex(lightColors.background);
const INK = hex(lightColors.text);
const MUTED = hex(lightColors.textMuted);
const GREEN = hex(lightColors.primary);
const GREEN_SOFT = hex(lightColors.primarySoft);
const GOLD = hex(lightColors.accent);
const TRACK = hex(lightColors.surfaceMuted);

export function renderTodayWidget(snapshot: WidgetSnapshot | null) {
  if (!snapshot) {
    return (
      <FlexWidget clickAction="OPEN_APP" style={{ width: "match_parent", height: "match_parent", backgroundColor: PAPER, borderRadius: 20, padding: 16, justifyContent: "center" }}>
        <TextWidget text="Eqra" style={{ fontSize: 18, fontWeight: "bold", color: INK }} />
        <TextWidget text="Ouvrez l’app pour voir votre journée." style={{ fontSize: 13, color: MUTED, marginTop: 4 }} />
      </FlexWidget>
    );
  }
  const percent = snapshot.goalXp > 0 ? Math.min(100, Math.round((snapshot.todayXp / snapshot.goalXp) * 100)) : 0;
  const resume = snapshot.resumeChapterName ? `${snapshot.resumeChapterName} · verset ${snapshot.resumeVerse ?? 1}` : "Commencer une sourate";
  const resumeUri = snapshot.resumeChapterId ? `eqra://surah/${snapshot.resumeChapterId}?verse=${snapshot.resumeVerse ?? 1}` : "eqra://quran";
  const due = snapshot.dueVerses + snapshot.dueWords;
  // La barre de progression : deux blocs côte à côte dont les largeurs sont en « flex ».
  const filled = Math.max(2, percent);
  return (
    <FlexWidget style={{ width: "match_parent", height: "match_parent", backgroundColor: PAPER, borderRadius: 20, padding: 14, flexDirection: "column", justifyContent: "space-between" }}>
      <FlexWidget clickAction="OPEN_APP" style={{ width: "match_parent", flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text="OBJECTIF DU JOUR" style={{ fontSize: 10, letterSpacing: 1.2, color: MUTED }} />
          <TextWidget text={`${snapshot.todayXp} / ${snapshot.goalXp} XP`} style={{ fontSize: 22, fontWeight: "bold", color: INK }} />
        </FlexWidget>
        <FlexWidget style={{ backgroundColor: GREEN_SOFT, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 }}>
          <TextWidget text={`${percent} %`} style={{ fontSize: 13, fontWeight: "bold", color: GREEN }} />
        </FlexWidget>
      </FlexWidget>

      <FlexWidget style={{ width: "match_parent", height: 6, flexDirection: "row", marginTop: 8 }}>
        <FlexWidget style={{ flex: filled, height: 6, backgroundColor: GOLD, borderRadius: 999 }} />
        <FlexWidget style={{ flex: 100 - filled, height: 6, backgroundColor: TRACK, borderRadius: 999 }} />
      </FlexWidget>

      <FlexWidget style={{ width: "match_parent", flexDirection: "row", alignItems: "center", marginTop: 10 }}>
        <TextWidget text={`${snapshot.currentStreak} jour${snapshot.currentStreak > 1 ? "s" : ""} de suite`} style={{ fontSize: 12, color: INK }} />
        <TextWidget text={due > 0 ? `   ·   ${due} à réviser` : "   ·   rien à réviser"} style={{ fontSize: 12, color: due > 0 ? GOLD : MUTED }} />
      </FlexWidget>

      <FlexWidget clickAction="OPEN_URI" clickActionData={{ uri: resumeUri }} style={{ width: "match_parent", backgroundColor: GREEN, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginTop: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <FlexWidget style={{ flexDirection: "column" }}>
          <TextWidget text="REPRENDRE" style={{ fontSize: 9, letterSpacing: 1.2, color: "#CFE3DB" }} />
          <TextWidget text={resume} style={{ fontSize: 13, fontWeight: "bold", color: "#FFFFFF" }} maxLines={1} truncate="END" />
        </FlexWidget>
        <TextWidget text="→" style={{ fontSize: 16, color: "#FFFFFF" }} />
      </FlexWidget>
    </FlexWidget>
  );
}
