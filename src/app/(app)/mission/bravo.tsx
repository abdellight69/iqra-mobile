import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { BigButton } from "@/components/kids/KidsHome";
import { ProgressBar } from "@/components/ProgressBar";
import { SafeArea } from "@/components/SafeArea";
import { LoadingState } from "@/components/States";
import { KIDS, useKidsColors } from "@/lib/kids";
import { useTodayMission } from "@/lib/missions";
import { STICKERS, stickersUnlocked } from "@/lib/missions-format";
import { closeScreen } from "@/lib/navigation";
import { useMe } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

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

  return (
    <SafeArea style={[styles.flex, { backgroundColor: colors.background }]} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.hero, { backgroundColor: colors.hero }]}>
          <View style={styles.stars} accessibilityLabel={`${stars} étoile${stars > 1 ? "s" : ""} gagnée${stars > 1 ? "s" : ""}`}>
            {Array.from({ length: Math.max(1, stars) }, (_, i) => (
              <Ionicons key={i} name="star" size={i === Math.floor(stars / 2) ? 96 : 64} color={KIDS.sun} />
            ))}
          </View>
          <AppText variant="display" color={KIDS.onHero} center>
            Bravo {me.data?.displayName ?? ""} !
          </AppText>
          <AppText variant="headline" color={KIDS.onHero} center>
            {last ? "Tu as fini toute ta mission !" : "Ta mission du jour est réussie"}
          </AppText>
        </View>

        <View style={[styles.pill, { backgroundColor: colors.surface }]}>
          <Ionicons name="star" size={26} color={KIDS.sun} />
          <AppText variant="title">
            +{stars} étoile{stars > 1 ? "s" : ""}
          </AppText>
        </View>

        <View style={styles.body}>
          <Card style={styles.sticker}>
            <View style={[styles.stickerIcon, { backgroundColor: sticker ? colors.surfaceMuted : kc.sunSoft }]}>
              {sticker ? (
                <Image source={sticker.image} style={styles.stickerImage} contentFit="contain" accessibilityLabel={sticker.label} />
              ) : (
                <Ionicons name="lock-closed" size={56} color={colors.textFaint} />
              )}
            </View>
            <View style={styles.flex}>
              <AppText variant="label" color={colors.accent}>
                {sticker ? "Mes autocollants" : "Premier autocollant"}
              </AppText>
              <AppText variant="headline">{sticker?.label ?? "Encore quelques étoiles !"}</AppText>
              <ProgressBar value={unlocked / STICKERS.length} />
              <AppText variant="caption" muted>
                {unlocked} autocollant{unlocked > 1 ? "s" : ""} sur {STICKERS.length}
              </AppText>
            </View>
          </Card>

          {!last && mission ? (
            <Card tone="flat" style={styles.tomorrow}>
              <Ionicons name="sunny" size={28} color={colors.primary} />
              <AppText variant="bodyStrong" style={styles.flex}>
                Prochaine fois : la suite de ta mission, jour {mission.dayIndex + 1} sur {mission.totalDays}.
              </AppText>
            </Card>
          ) : null}

          <BigButton title="Retour à l’accueil" icon="home" onPress={() => closeScreen("/")} />
        </View>
      </ScrollView>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { paddingBottom: spacing.xxxl },
  hero: { paddingTop: spacing.xxxl + spacing.xl, paddingBottom: spacing.xxxl, paddingHorizontal: spacing.xl, gap: spacing.md, borderBottomLeftRadius: 44, borderBottomRightRadius: 44 },
  stars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", minHeight: 110 },
  pill: { alignSelf: "center", flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: -28, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: radius.pill },
  body: { padding: spacing.lg, gap: spacing.lg },
  sticker: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  stickerIcon: { width: 104, height: 104, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  stickerImage: { width: 96, height: 96, transform: [{ rotate: "-8deg" }] },
  tomorrow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
