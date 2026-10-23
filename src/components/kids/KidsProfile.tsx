import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Screen } from "@/components/Screen";
import { KIDS } from "@/lib/kids";
import { useTodayMission } from "@/lib/missions";
import { STARS_PER_STICKER, STICKERS, stickersUnlocked } from "@/lib/missions-format";
import { useMe } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

/**
 * Onglet « Moi » d'un profil enfant : ses étoiles, sa collection d'autocollants, et deux chemins
 * seulement (changer de profil, sa famille). Ni statistiques, ni réglages, ni compte.
 */
export function KidsProfile() {
  const colors = useColors();
  const me = useMe();
  const today = useTodayMission();
  const stars = today.data?.totalStars ?? 0;
  const unlocked = stickersUnlocked(stars);
  const toNext = STARS_PER_STICKER - (stars % STARS_PER_STICKER);

  return (
    <Screen refreshing={today.isRefetching} onRefresh={() => void today.refetch()}>
      <View style={styles.identity}>
        <ProfileAvatar name={me.data?.displayName ?? "?"} avatar={me.data?.avatar} size={96} />
        <AppText variant="display" center>
          {me.data?.displayName ?? ""}
        </AppText>
        <View style={[styles.stars, { backgroundColor: colors.surface }]}>
          <Ionicons name="star" size={28} color={KIDS.sun} />
          <AppText variant="title">
            {stars} étoile{stars > 1 ? "s" : ""}
          </AppText>
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="title">Mes autocollants</AppText>
        <AppText muted>
          {unlocked === STICKERS.length ? "Tu les as tous, bravo !" : `Encore ${toNext} étoile${toNext > 1 ? "s" : ""} pour le prochain.`}
        </AppText>
        <View style={styles.grid}>
          {STICKERS.map((sticker, i) => {
            const open = i < unlocked;
            return (
              <View
                key={sticker.label}
                accessibilityLabel={open ? sticker.label : "Autocollant à gagner"}
                style={[styles.sticker, { backgroundColor: open ? colors.surface : colors.surfaceMuted }]}>
                {open ? (
                  <>
                    <Image source={sticker.image} style={styles.stickerImage} contentFit="contain" />
                    <AppText variant="caption" center numberOfLines={1}>
                      {sticker.label}
                    </AppText>
                  </>
                ) : (
                  <Ionicons name="lock-closed" size={22} color={colors.textFaint} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      <Card onPress={() => router.push("/profiles")} style={styles.row}>
        <Ionicons name="people" size={26} color={colors.primary} />
        <AppText variant="headline" style={styles.flex}>
          Changer de profil
        </AppText>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Card>
      <Card onPress={() => router.push("/famille")} style={styles.row}>
        <Ionicons name="heart" size={26} color={colors.primary} />
        <AppText variant="headline" style={styles.flex}>
          Ma famille
        </AppText>
        <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { alignItems: "center", gap: spacing.sm, marginTop: spacing.lg },
  stars: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  section: { gap: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  sticker: { width: "31%", flexGrow: 1, minHeight: 104, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: 4, padding: spacing.xs },
  stickerImage: { width: 64, height: 64 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
});
