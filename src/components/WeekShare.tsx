import * as Sharing from "expo-sharing";
import { useRef, useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import ViewShot, { type ViewShotRef } from "react-native-view-shot";
import { DAY_LETTERS, type Week, weekHeadline, weekLabel, weekSummary } from "@/lib/week";
import { fonts, radius, spacing } from "@/lib/theme";
import { AppText } from "./AppText";
import { BrandMark } from "./BrandMark";
import { Button } from "./Button";

/** Couleurs fixes de la carte partagée (comme la carte « Émeraude » du partage de verset). */
const CARD = { background: "#0F4F44", text: "#F7F5F0", muted: "#FFFFFF8C", accent: "#D9B56A", bar: "#FFFFFF3D" } as const;
const CARD_WIDTH = 360;

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** La carte de la semaine telle qu'elle est capturée en image : titre, résumé, les sept jours, la série. */
export function WeekShareCard({ week }: { week: Week }) {
  const maxXp = Math.max(1, ...week.days.map((d) => d.xp));
  const summary = weekSummary(week.totals);
  return (
    <View style={styles.card}>
      <BrandMark size={30} color={CARD.accent} />
      <AppText variant="label" center style={{ color: CARD.muted }}>
        {weekLabel(week.weekStart, week.weekEnd)}
      </AppText>
      <AppText center style={[styles.headline, { color: CARD.text }]}>
        {weekHeadline(week)}
      </AppText>
      <AppText center style={{ color: CARD.text }}>
        {summary || "Une semaine de repos."}
      </AppText>
      <View style={styles.bars}>
        {week.days.map((day, i) => (
          <View key={day.day} style={styles.barColumn}>
            <View style={styles.barTrack}>
              <View style={[styles.bar, { height: day.practiced ? Math.max(8, Math.round((day.xp / maxXp) * 56)) : 4, backgroundColor: day.practiced ? CARD.accent : CARD.bar }]} />
            </View>
            <AppText variant="caption" style={{ color: day.practiced ? CARD.text : CARD.muted }}>
              {DAY_LETTERS[i]}
            </AppText>
          </View>
        ))}
      </View>
      {week.streak > 0 ? (
        <AppText variant="caption" center style={{ color: CARD.accent }}>
          {plural(week.streak, "jour de suite", "jours de suite")}
        </AppText>
      ) : null}
      <View style={[styles.rule, { backgroundColor: CARD.accent }]} />
      <AppText variant="label" center style={[styles.brand, { color: CARD.muted }]}>
        Eqra
      </AppText>
    </View>
  );
}

/**
 * « Partager ma semaine » : capture la carte (rendue hors écran) et ouvre la feuille de partage.
 * Sur le web, la capture n'existe pas : rien n'est affiché.
 */
export function WeekShareButton({ week }: { week: Week }) {
  const card = useRef<ViewShotRef>(null);
  const [sharing, setSharing] = useState(false);
  if (Platform.OS === "web") return null;

  async function share() {
    if (!card.current) return;
    setSharing(true);
    try {
      const uri = await card.current.capture();
      await Sharing.shareAsync(uri, { mimeType: "image/png", UTI: "public.png", dialogTitle: "Partager ma semaine" });
    } catch {
      Alert.alert("Partage impossible", "L’image de la semaine n’a pas pu être créée.");
    } finally {
      setSharing(false);
    }
  }

  return (
    <>
      <Button title="Partager ma semaine" icon="share-outline" variant="secondary" size="md" loading={sharing} onPress={() => void share()} />
      {/* Carte capturée : rendue hors de l'écran, jamais visible. */}
      <View pointerEvents="none" style={styles.offscreen} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <ViewShot ref={card} options={{ format: "png", quality: 1, result: "tmpfile" }}>
          <WeekShareCard week={week} />
        </ViewShot>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  offscreen: { position: "absolute", top: 0, left: -4 * CARD_WIDTH, width: CARD_WIDTH },
  card: { width: CARD_WIDTH, backgroundColor: CARD.background, borderRadius: radius.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.xxl, alignItems: "center", gap: spacing.md },
  headline: { fontFamily: fonts.serifSemibold, fontSize: 24, lineHeight: 30 },
  bars: { flexDirection: "row", justifyContent: "space-between", alignSelf: "stretch", marginTop: spacing.sm },
  barColumn: { alignItems: "center", gap: 4, width: 32 },
  barTrack: { height: 56, justifyContent: "flex-end", width: 14 },
  bar: { width: 14, borderRadius: radius.sm },
  rule: { width: 36, height: 1.5, borderRadius: 1 },
  brand: { letterSpacing: 3 },
});
