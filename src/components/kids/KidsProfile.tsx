import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Screen } from "@/components/Screen";
import { KID_TONES, KIDS, useKidsColors } from "@/lib/kids";
import { useTodayMission } from "@/lib/missions";
import { STARS_PER_STICKER, STICKERS, stickersUnlocked } from "@/lib/missions-format";
import { useMe } from "@/lib/queries";
import { elevation, radius, spacing, useColors } from "@/lib/theme";

/**
 * Onglet « Moi » d'un profil enfant : ses étoiles, son album d'autocollants, et deux chemins
 * seulement (changer de profil, sa famille). Ni statistiques, ni réglages, ni compte.
 */
export function KidsProfile() {
  const colors = useColors();
  const kc = useKidsColors();
  const me = useMe();
  const today = useTodayMission();
  const stars = today.data?.totalStars ?? 0;
  const unlocked = stickersUnlocked(stars);
  const toNext = STARS_PER_STICKER - (stars % STARS_PER_STICKER);

  return (
    <Screen refreshing={today.isRefetching} onRefresh={() => void today.refetch()}>
      <View style={styles.identity}>
        <View style={[styles.ring, { backgroundColor: colors.surface }, elevation(colors, 2)]}>
          <ProfileAvatar name={me.data?.displayName ?? "?"} avatar={me.data?.avatar} size={92} />
        </View>
        <AppText variant="display" center>
          {me.data?.displayName ?? ""}
        </AppText>
        <View style={[styles.stars, { backgroundColor: kc.sunSoft }]}>
          <Ionicons name="star" size={26} color={KIDS.sun} />
          <AppText variant="headline" color={kc.onSunSoft}>
            {stars} étoile{stars > 1 ? "s" : ""}
          </AppText>
        </View>
      </View>

      <Card style={styles.album}>
        <View style={styles.albumTitle}>
          <AppText variant="headline">Mes autocollants</AppText>
          <AppText variant="bodyStrong" muted>
            {unlocked} sur {STICKERS.length}
          </AppText>
        </View>
        <AppText variant="caption" muted>
          {unlocked === STICKERS.length ? "Tu les as tous, bravo !" : `Encore ${toNext} étoile${toNext > 1 ? "s" : ""} pour le prochain !`}
        </AppText>
        <View style={[styles.grid, { backgroundColor: colors.background }]}>
          {STICKERS.map((sticker, i) => {
            const open = i < unlocked;
            return (
              <View
                key={sticker.label}
                accessibilityLabel={open ? sticker.label : "Autocollant à gagner"}
                style={[styles.sticker, { backgroundColor: open ? colors.surface : colors.surfaceMuted }]}>
                {open ? <Image source={sticker.image} style={styles.stickerImage} contentFit="contain" /> : <Ionicons name="lock-closed" size={20} color={kc.neutralInk} />}
              </View>
            );
          })}
        </View>
      </Card>

      <Card onPress={() => router.push("/profiles")} style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: kc.tint("blue").bg }]}>
          <Ionicons name="people" size={24} color={KID_TONES.blue.main} />
        </View>
        <AppText variant="headline" style={styles.flex}>
          Changer de profil
        </AppText>
        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
      </Card>
      <Card onPress={() => router.push("/famille")} style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: kc.tint("pink").bg }]}>
          <Ionicons name="heart" size={24} color={KID_TONES.pink.main} />
        </View>
        <AppText variant="headline" style={styles.flex}>
          Ma famille
        </AppText>
        <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  ring: { padding: 6, borderRadius: 52 },
  stars: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: spacing.md, paddingRight: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  album: { gap: spacing.sm + 2 },
  albumTitle: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 2, borderRadius: 22, padding: spacing.sm },
  sticker: { width: "22%", flexGrow: 1, aspectRatio: 1, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  stickerImage: { width: "90%", height: "90%" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: 24, paddingVertical: spacing.md },
  rowIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
