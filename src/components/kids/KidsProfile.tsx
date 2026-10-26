import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { KidAvatarFrame } from "@/components/kids/KidAvatarFrame";
import { KidVoiceButton } from "@/components/kids/KidVoiceButton";
import { Screen } from "@/components/Screen";
import { avatarLevel } from "@/lib/kid-avatar";
import { KID_TONES, KIDS, useKidsColors, type KidTone } from "@/lib/kids";
import { useTodayMission } from "@/lib/missions";
import { STARS_PER_STICKER, STICKERS, stickersUnlocked } from "@/lib/missions-format";
import { useChapters, useMe, usePlans, useThemes } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

/**
 * Onglet « Moi » d'un profil enfant : ses étoiles, son album d'autocollants, et deux chemins
 * seulement (changer de profil, sa famille). Ni statistiques, ni réglages, ni compte.
 */
export function KidsProfile() {
  const colors = useColors();
  const kc = useKidsColors();
  const me = useMe();
  const today = useTodayMission();
  const themes = useThemes();
  const plans = usePlans();
  const chapters = useChapters();
  const stars = today.data?.totalStars ?? 0;
  // Albums : les thèmes illustrés ; trophées : les sourates sues par cœur (tous les versets solides).
  const albums = (themes.data ?? []).filter((t) => t.imageCount > 0);
  const trophies = (plans.data ?? []).filter((p) => p.progress.total > 0 && p.progress.solid >= p.progress.total);
  const chapterName = (id: number) => chapters.data?.find((c) => c.id === id)?.nameSimple ?? `Sourate ${id}`;
  const unlocked = stickersUnlocked(stars);
  const toNext = STARS_PER_STICKER - (stars % STARS_PER_STICKER);
  const name = me.data?.displayName ?? "";
  const voice = today.data
    ? `${name}, tu as ${stars} étoile${stars > 1 ? "s" : ""} et ${unlocked} autocollant${unlocked > 1 ? "s" : ""} sur ${STICKERS.length}. Tu es au niveau ${avatarLevel(unlocked).level}. ${
        unlocked === STICKERS.length ? "Tu as tous les autocollants, bravo !" : `Encore ${toNext} étoile${toNext > 1 ? "s" : ""} pour le prochain autocollant.`
      }`
    : "";

  return (
    <Screen refreshing={today.isRefetching} onRefresh={() => void today.refetch()}>
      <View style={styles.identity}>
        <KidAvatarFrame name={name || "?"} avatar={me.data?.avatar} stars={stars} size={92} />
        <AppText variant="display" center>
          {name}
        </AppText>
        <View style={styles.starsRow}>
          <View style={[styles.stars, { backgroundColor: kc.sunSoft }]}>
            <Ionicons name="star" size={26} color={KIDS.sun} />
            <AppText variant="headline" color={kc.onSunSoft}>
              {stars} étoile{stars > 1 ? "s" : ""}
            </AppText>
          </View>
          <KidVoiceButton text={voice} />
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

      {albums.length > 0 ? (
        <View style={styles.section}>
          <AppText variant="headline">Mes albums</AppText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albums}>
            {albums.map((t, i) => {
              const tone = ALBUM_TONES[i % ALBUM_TONES.length]!;
              const complete = t.learnedCount >= t.imageCount;
              return (
                <Card
                  key={t.id}
                  onPress={() => router.push({ pathname: "/album/[themeId]", params: { themeId: t.id } })}
                  style={styles.albumCard}
                  accessibilityLabel={`Album ${t.title}, ${Math.min(t.learnedCount, t.imageCount)} images sur ${t.imageCount}`}>
                  <View style={[styles.albumIcon, { backgroundColor: complete ? KIDS.sun : KID_TONES[tone].main }]}>
                    <Ionicons name={complete ? "trophy" : "images"} size={22} color={complete ? KIDS.sunInk : KIDS.onHero} />
                  </View>
                  <AppText variant="bodyStrong" numberOfLines={2}>
                    {t.title}
                  </AppText>
                  <AppText variant="caption" muted>
                    {complete ? "Complet !" : `${Math.min(t.learnedCount, t.imageCount)} / ${t.imageCount}`}
                  </AppText>
                </Card>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.section}>
        <AppText variant="headline">Mes sourates par cœur</AppText>
        {trophies.length === 0 ? (
          <AppText variant="caption" muted>
            Apprends une sourate en entier dans « Réciter » pour gagner ton premier trophée.
          </AppText>
        ) : (
          <View style={styles.trophies}>
            {trophies.map((p) => (
              <View key={p.id} style={[styles.trophy, { backgroundColor: kc.sunSoft }]} accessibilityLabel={`${chapterName(p.chapterId)}, sue par cœur`}>
                <Ionicons name="trophy" size={22} color={KIDS.sunStroke} />
                <AppText variant="bodyStrong" color={kc.onSunSoft} numberOfLines={1}>
                  {chapterName(p.chapterId)}
                </AppText>
              </View>
            ))}
          </View>
        )}
      </View>

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

/** Couleurs des albums, dans l'ordre d'affichage. */
const ALBUM_TONES: KidTone[] = ["violet", "green", "blue", "orange", "pink"];

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { alignItems: "center", gap: spacing.sm, marginTop: spacing.sm },
  starsRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stars: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: spacing.md, paddingRight: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  album: { gap: spacing.sm + 2 },
  albumTitle: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm + 2, borderRadius: 22, padding: spacing.sm },
  sticker: { width: "22%", flexGrow: 1, aspectRatio: 1, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  stickerImage: { width: "90%", height: "90%" },
  section: { gap: spacing.sm },
  albums: { gap: spacing.sm + 2, paddingRight: spacing.lg },
  albumCard: { width: 132, gap: spacing.xs, padding: spacing.md, borderRadius: 22 },
  albumIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  trophies: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  trophy: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingLeft: spacing.md, paddingRight: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: 24, paddingVertical: spacing.md },
  rowIcon: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
});
