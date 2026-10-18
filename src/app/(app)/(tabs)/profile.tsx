import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import type { ComponentProps } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { StatTile } from "@/components/StatTile";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
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

  // Sept derniers jours, du plus ancien au plus récent.
  const today = s ? new Date(`${s.today.day}T12:00:00Z`) : new Date();
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today.getTime() - (6 - i) * 86_400_000);
    const day = d.toISOString().slice(0, 10);
    return { day, label: WEEKDAYS[d.getUTCDay()] ?? "", xp: s?.lastDays.find((x) => x.day === day)?.xp ?? 0 };
  });
  const maxXp = Math.max(s?.today.goalXp ?? 30, ...week.map((w) => w.xp));

  async function logout() {
    if (refreshToken) await api("/auth/logout", { method: "POST", body: { refreshToken }, auth: false }).catch(() => undefined);
    await signOut();
  }

  return (
    <Screen>
      <View style={styles.identity}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <AppText variant="title" color={colors.onPrimary}>
            {me.data?.displayName.slice(0, 1).toUpperCase() ?? "?"}
          </AppText>
        </View>
        <View style={styles.flex}>
          <AppText variant="title">{me.data?.displayName ?? ""}</AppText>
          <AppText muted>{me.data?.email}</AppText>
        </View>
      </View>

      <View style={styles.row}>
        <StatTile icon="flame" value={s?.currentStreak ?? 0} label="Série (jours)" color={colors.accent} />
        <StatTile icon="trophy" value={s?.longestStreak ?? 0} label="Record" color={colors.accent} />
        <StatTile icon="star" value={s?.xp ?? 0} label="XP" color={colors.accent} />
      </View>

      <Card style={styles.week}>
        <AppText variant="heading">Cette semaine</AppText>
        <View style={styles.bars}>
          {week.map((w) => (
            <View key={w.day} style={styles.barCol}>
              <View style={[styles.barTrack, { backgroundColor: colors.surfaceMuted }]}>
                <View
                  style={[
                    styles.bar,
                    { height: `${(w.xp / maxXp) * 100}%`, backgroundColor: w.xp >= (s?.today.goalXp ?? 30) ? colors.accent : colors.primary },
                  ]}
                />
              </View>
              <AppText variant="caption" muted>
                {w.label}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <View style={styles.row}>
        <StatTile icon="school" value={s?.vocabulary.mastered ?? 0} label="Mots maîtrisés" />
        <StatTile icon="ribbon" value={s?.memorization.solid ?? 0} label="Versets solides" />
        <StatTile icon="book" value={s?.today.versesRead ?? 0} label="Lus aujourd'hui" />
      </View>

      <Card padded={false}>
        <MenuItem icon="settings-outline" label="Réglages de lecture et du compte" onPress={() => router.push("/settings")} />
        <MenuItem icon="bookmarks-outline" label="Mes signets" onPress={() => router.push("/bookmarks")} />
        <MenuItem
          icon="log-out-outline"
          label="Se déconnecter"
          danger
          onPress={() => Alert.alert("Se déconnecter ?", undefined, [{ text: "Annuler", style: "cancel" }, { text: "Déconnexion", style: "destructive", onPress: () => void logout() }])}
        />
      </Card>

      <AppText variant="caption" muted center>
        Textes et audio : Quran.com (Quran Foundation) · Grammaire : Quranic Arabic Corpus · Vocabulaire : « 80% des mots du Qour’ân »
        (Al-Lawh, CC BY-NC-SA)
      </AppText>
    </Screen>
  );
}

function MenuItem({ icon, label, onPress, danger }: { icon: ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; danger?: boolean }) {
  const colors = useColors();
  const color = danger ? colors.danger : colors.text;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.menuItem, { opacity: pressed ? 0.6 : 1, borderBottomColor: colors.border }]}>
      <Ionicons name={icon} size={22} color={danger ? colors.danger : colors.primary} />
      <AppText style={styles.flex} color={color}>
        {label}
      </AppText>
      {!danger ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  identity: { flexDirection: "row", alignItems: "center", gap: spacing.lg, marginTop: spacing.md },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  row: { flexDirection: "row", gap: spacing.md },
  week: { gap: spacing.md },
  bars: { flexDirection: "row", justifyContent: "space-between", height: 110 },
  barCol: { alignItems: "center", gap: 4, flex: 1 },
  barTrack: { flex: 1, width: 14, borderRadius: radius.pill, justifyContent: "flex-end", overflow: "hidden" },
  bar: { width: "100%", borderRadius: radius.pill },
  menuItem: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
});
