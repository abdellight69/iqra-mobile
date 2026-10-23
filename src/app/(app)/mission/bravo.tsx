import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { BigButton } from "@/components/kids/KidButton";
import { ProgressBar } from "@/components/ProgressBar";
import { SafeArea } from "@/components/SafeArea";
import { LoadingState } from "@/components/States";
import { KID_TONES, KIDS, useKidsColors } from "@/lib/kids";
import { useTodayMission } from "@/lib/missions";
import { STICKERS, stickersUnlocked } from "@/lib/missions-format";
import { closeScreen } from "@/lib/navigation";
import { useMe } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

/** Confettis posés derrière les étoiles (position en points, sur une largeur d'écran courante). */
const CONFETTI = [
  { x: 30, y: 40, s: 14, color: KID_TONES.sun.main, round: true },
  { x: 340, y: 24, s: 12, color: KID_TONES.blue.main, round: true },
  { x: 306, y: 110, s: 16, color: KID_TONES.pink.main, round: true },
  { x: 52, y: 120, s: 10, color: KID_TONES.green.main, round: true },
  { x: 80, y: 90, s: 12, color: KID_TONES.violet.main, round: false },
  { x: 282, y: 76, s: 10, color: KID_TONES.orange.main, round: false },
  { x: 190, y: 6, s: 10, color: KID_TONES.orange.main, round: true },
  { x: 120, y: 150, s: 10, color: KID_TONES.blue.main, round: false },
  { x: 262, y: 140, s: 12, color: KID_TONES.sun.main, round: true },
];

/** Mission du jour réussie : les étoiles gagnées, l'autocollant, et la suite pour demain. */
export default function MissionBravo() {
  const colors = useColors();
  const kc = useKidsColors();
  const me = useMe();
  const today = useTodayMission();
  useEffect(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  if (today.isPending) return <LoadingState />;
  const mission = today.data?.mission ?? null;
  const total = today.data?.totalStars ?? 0;
  const stars = mission?.stars ?? 0;
  const unlocked = stickersUnlocked(total);
  const sticker = unlocked > 0 ? STICKERS[unlocked - 1] : null;
  const last = mission ? mission.dayIndex >= mission.totalDays : false;
  const green = kc.tint("green");
  const violet = kc.tint("violet");

  return (
    <SafeArea style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View pointerEvents="none" style={styles.confettiLayer} aria-hidden>
          {CONFETTI.map((c, i) => (
            <View key={i} style={{ position: "absolute", left: c.x, top: c.y, width: c.s, height: c.s, borderRadius: c.round ? c.s / 2 : 3, backgroundColor: c.color, transform: [{ rotate: `${(i * 37) % 60}deg` }] }} />
          ))}
        </View>

        <View style={styles.stars} accessibilityLabel={`${stars} étoile${stars > 1 ? "s" : ""} gagnée${stars > 1 ? "s" : ""}`}>
          {Array.from({ length: Math.max(1, stars) }, (_, i) => {
            const middle = i === Math.floor(stars / 2);
            return <Ionicons key={i} name="star" size={middle ? 118 : 78} color={KIDS.sun} style={{ marginBottom: middle ? 18 : 8, transform: [{ rotate: middle ? "0deg" : i < stars / 2 ? "-14deg" : "14deg" }] }} />;
          })}
        </View>
        <AppText variant="display" center>
          Bravo {me.data?.displayName ?? ""} !
        </AppText>
        <AppText muted center>
          {last ? "Tu as fini toute ta mission !" : "Ta mission du jour est réussie"}
        </AppText>
        <View style={[styles.pill, { backgroundColor: kc.sunSoft }]}>
          <Ionicons name="star" size={26} color={KIDS.sun} />
          <AppText variant="headline" color={kc.onSunSoft}>
            +{stars} étoile{stars > 1 ? "s" : ""}
          </AppText>
        </View>

        <Card style={styles.sticker}>
          <View style={[styles.stickerIcon, { backgroundColor: sticker ? colors.background : kc.sunSoft }]}>
            {sticker ? (
              <Image source={sticker.image} style={styles.stickerImage} contentFit="contain" accessibilityLabel={sticker.label} />
            ) : (
              <Ionicons name="lock-closed" size={48} color={colors.textFaint} />
            )}
          </View>
          <View style={styles.flex}>
            <AppText variant="label" color={violet.ink}>
              {sticker ? "Nouvel autocollant" : "Premier autocollant"}
            </AppText>
            <AppText variant="headline">{sticker?.label ?? "Encore quelques étoiles !"}</AppText>
            <ProgressBar value={unlocked / STICKERS.length} color={KID_TONES.violet.main} height={10} />
            <AppText variant="caption" muted>
              {unlocked} autocollant{unlocked > 1 ? "s" : ""} sur {STICKERS.length}
            </AppText>
          </View>
        </Card>

        {!last && mission ? (
          <View style={[styles.tomorrow, { backgroundColor: green.bg }]}>
            <Ionicons name="sunny" size={28} color={KID_TONES.green.edge} />
            <AppText variant="bodyStrong" color={green.ink} style={styles.flex}>
              Prochaine fois : la suite de ta mission, jour {mission.dayIndex + 1} sur {mission.totalDays}.
            </AppText>
          </View>
        ) : null}

        <View style={styles.flex} />
        <BigButton title="Retour à l’accueil" icon="home" onPress={() => closeScreen("/")} />
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: spacing.lg, paddingTop: spacing.xl, gap: spacing.md },
  confettiLayer: { position: "absolute", left: 0, top: 0, right: 0, height: 200 },
  stars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", minHeight: 130 },
  pill: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: spacing.md, paddingRight: spacing.lg + 4, paddingVertical: spacing.sm + 2, borderRadius: radius.pill },
  sticker: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: spacing.sm },
  stickerIcon: { width: 104, height: 104, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  stickerImage: { width: 96, height: 96, transform: [{ rotate: "-8deg" }] },
  tomorrow: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.lg, padding: spacing.lg },
});
