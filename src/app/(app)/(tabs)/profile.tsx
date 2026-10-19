import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ListGroup, ListRow } from "@/components/List";
import { Screen } from "@/components/Screen";
import { StatTile } from "@/components/StatTile";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { offlineSupported } from "@/lib/offline";
import { useMe, useStats } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

const WEEKDAYS = ["D", "L", "M", "M", "J", "V", "S"];

export default function Profile() {
  const colors = useColors();
  const me = useMe();
  const stats = useStats();
  const signOut = useAuth((s) => s.signOut);
  const refreshToken = useAuth((s) => s.tokens?.refreshToken);
  const s = stats.data;
  const goal = s?.today.goalXp ?? 30;

  // Sept derniers jours, du plus ancien au plus récent.
  const today = s ? new Date(`${s.today.day}T12:00:00Z`) : new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86_400_000);
    const day = d.toISOString().slice(0, 10);
    return {
      day,
      label: WEEKDAYS[d.getUTCDay()] ?? "",
      xp: s?.lastDays.find((x) => x.day === day)?.xp ?? 0,
      frozen: s?.streakFreeze?.frozenDays.includes(day) ?? false,
      isToday: i === 6,
    };
  });
  const maxXp = Math.max(goal, ...week.map((w) => w.xp));
  const weekXp = week.reduce((n, w) => n + w.xp, 0);

  async function logout() {
    if (refreshToken)
      await api("/auth/logout", {
        method: "POST",
        body: { refreshToken },
        auth: false,
      }).catch(() => undefined);
    await signOut();
  }

  return (
    <Screen
      onRefresh={() => void stats.refetch()}
      refreshing={stats.isRefetching}
    >
      <View style={styles.identity}>
        <View style={styles.avatar}>
          <ProfileAvatar
            name={me.data?.displayName ?? "?"}
            avatar={me.data?.avatar}
            size={76}
          />
        </View>
        <AppText variant="display" center>
          {me.data?.displayName ?? ""}
        </AppText>
        <AppText muted center>
          {me.data?.email}
        </AppText>
      </View>

      <View style={styles.stats}>
        <StatTile
          value={s?.currentStreak ?? 0}
          label={(s?.currentStreak ?? 0) > 1 ? "jours de suite" : "jour de suite"}
          color={colors.accent}
        />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatTile value={s?.longestStreak ?? 0} label="meilleure série" />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatTile value={s?.xp ?? 0} label="XP au total" />
      </View>

      <Card style={styles.week}>
        <View style={styles.weekHeader}>
          <AppText variant="headline">Cette semaine</AppText>
          <AppText variant="caption" muted>
            {weekXp} XP
          </AppText>
        </View>
        <AppText variant="caption" muted>
          Un jour manqué par semaine ne casse pas votre série.
        </AppText>
        <View style={styles.bars}>
          {week.map((w) => (
            <View key={w.day} style={styles.barCol}>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(w.xp > 0 ? 6 : 0, (w.xp / maxXp) * 100)}%`,
                      backgroundColor:
                        w.xp >= goal ? colors.accent : colors.primary,
                    },
                  ]}
                />
                {w.frozen ? (
                  <Ionicons
                    name="snow"
                    size={14}
                    color={colors.primary}
                    accessibilityLabel="Jour couvert par le répit"
                  />
                ) : w.xp === 0 ? (
                  <View
                    style={[
                      styles.emptyDot,
                      { backgroundColor: colors.border },
                    ]}
                  />
                ) : null}
              </View>
              <AppText
                variant="caption"
                color={w.isToday ? colors.text : colors.textFaint}
              >
                {w.label}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.stats}>
        <StatTile value={s?.vocabulary.mastered ?? 0} label="mots maîtrisés" />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatTile value={s?.memorization.solid ?? 0} label="versets solides" />
        <View style={[styles.divider, { backgroundColor: colors.border }]} />
        <StatTile value={s?.today.versesRead ?? 0} label="lus aujourd’hui" />
      </View>

      <ListGroup>
        <ListRow
          icon="people-outline"
          title="Changer de profil"
          subtitle="Un profil par membre de la famille"
          onPress={() => router.push("/profiles")}
        />
        <ListRow
          icon="options-outline"
          title="Réglages"
          subtitle="Traduction, récitateur, objectif, compte"
          onPress={() => router.push("/settings")}
        />
        <ListRow
          icon="bookmark-outline"
          title="Signets"
          onPress={() => router.push("/bookmarks")}
        />
        {offlineSupported ? (
          <ListRow
            icon="cloud-download-outline"
            title="Téléchargements"
            subtitle="Sourates disponibles hors ligne"
            onPress={() => router.push("/downloads")}
          />
        ) : null}
        {me.data?.isOwner === false ? null : (
          <ListRow
            icon="log-out-outline"
            title="Se déconnecter"
            danger
            chevron={false}
            onPress={() =>
              Alert.alert("Se déconnecter ?", undefined, [
                { text: "Annuler", style: "cancel" },
                {
                  text: "Déconnexion",
                  style: "destructive",
                  onPress: () => void logout(),
                },
              ])
            }
          />
        )}
      </ListGroup>

      <AppText variant="caption" faint center>
        Textes et audio : Quran.com (Quran Foundation){"\n"}Grammaire : Quranic
        Arabic Corpus{"\n"}Vocabulaire : « 80% des mots du Qour’ân » (Al-Lawh,
        CC BY-NC-SA)
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  identity: { alignItems: "center", gap: spacing.xs, marginTop: spacing.lg },
  avatar: { marginBottom: spacing.sm },
  stats: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    paddingHorizontal: spacing.xs,
  },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  week: { gap: spacing.lg },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  bars: { flexDirection: "row", justifyContent: "space-between", height: 110 },
  barCol: { alignItems: "center", gap: 6, flex: 1 },
  barTrack: {
    flex: 1,
    width: 10,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  bar: { width: "100%", borderRadius: radius.pill },
  emptyDot: { width: 4, height: 4, borderRadius: 2 },
});
