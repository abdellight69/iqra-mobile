import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { ProgressRing } from "@/components/ProgressRing";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { StatTile } from "@/components/StatTile";
import { useAuth } from "@/lib/auth-store";
import { useChapters, useComprehension, useMe, useReadingPosition, useStats } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";

// Texte uthmani de 17:9 tel que dans Tanzil (vérifié), voir backend/data/README.md.
const VERSE_OF_REFLECTION =
  "إِنَّ هَٰذَا ٱلْقُرْءَانَ يَهْدِى لِلَّتِى هِىَ أَقْوَمُ وَيُبَشِّرُ ٱلْمُؤْمِنِينَ ٱلَّذِينَ يَعْمَلُونَ ٱلصَّٰلِحَٰتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا";

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 5 ? "Bonne nuit" : hour < 18 ? "Bonjour" : "Bonsoir";
}

function today(): string {
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function Home() {
  const colors = useColors();
  const me = useMe();
  const userName = useAuth((s) => s.user?.displayName);
  const stats = useStats();
  const position = useReadingPosition();
  const chapters = useChapters();
  const comprehension = useComprehension();
  const s = stats.data;
  const lastChapter = position.data ? chapters.data?.find((c) => c.id === position.data?.chapterId) : undefined;
  const goal = s ? s.today.xp / s.today.goalXp : 0;
  const resumeChapter = comprehension.data?.find((c) => c.chapterId === (position.data?.chapterId ?? 1));
  const recognized = resumeChapter?.totalWords ? Math.round((resumeChapter.knownWords / resumeChapter.totalWords) * 100) : 0;

  return (
    <Screen
      refreshing={stats.isRefetching || position.isRefetching}
      onRefresh={() => {
        void stats.refetch();
        void position.refetch();
        void me.refetch();
        void comprehension.refetch();
      }}>
      <View style={styles.header}>
        <AppText variant="label" muted>
          {today()}
        </AppText>
        <AppText variant="display">
          {greeting()}
          {userName ? `,\n${userName}` : ""}
        </AppText>
      </View>

      <Card style={styles.goalCard}>
        <ProgressRing value={goal} size={88} stroke={6} color={colors.accent}>
          <AppText variant="headline">{Math.round(Math.min(goal, 1) * 100)}%</AppText>
        </ProgressRing>
        <View style={styles.goalText}>
          <AppText variant="label" muted>
            Objectif du jour
          </AppText>
          <AppText variant="title">
            {s?.today.xp ?? 0}
            <AppText variant="headline" muted>
              {" "}/ {s?.today.goalXp ?? 30} XP
            </AppText>
          </AppText>
          <View style={styles.streak}>
            <Ionicons name="flame" size={14} color={colors.accent} />
            <AppText variant="caption" muted>
              {s?.currentStreak ?? 0} jour{(s?.currentStreak ?? 0) > 1 ? "s" : ""} de suite
            </AppText>
          </View>
        </View>
      </Card>

      <View style={styles.stats}>
        <StatTile value={s?.xp ?? 0} label="XP au total" />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatTile value={s?.vocabulary.learned ?? 0} label="mots appris" />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatTile value={s?.memorization.verses ?? 0} label="versets suivis" />
      </View>

      <SectionHeader title="Reprendre la lecture" />
      <Card
        tone="primary"
        onPress={() =>
          router.push({
            pathname: "/surah/[id]",
            params: { id: String(position.data?.chapterId ?? 1), verse: String(position.data?.verseNumber ?? 1) },
          })
        }
        style={styles.resume}>
        <View style={styles.flex}>
          <AppText variant="label" color="#FFFFFF99">
            {position.data ? `Verset ${position.data.verseNumber}` : "Commencer"}
          </AppText>
          <AppText variant="title" color="#FFFFFF">
            {lastChapter ? lastChapter.nameSimple : "Al-Fâtiha"}
          </AppText>
          <View style={styles.resumeCta}>
            <AppText variant="caption" color="#FFFFFFCC">
              {recognized > 0 ? `${recognized}\u00A0% des mots reconnus · Ouvrir` : "Ouvrir"}
            </AppText>
            <Ionicons name="arrow-forward" size={14} color="#FFFFFFCC" />
          </View>
        </View>
        {lastChapter ? (
          <ArabicText size={34} color="#E9D9B0">
            {lastChapter.nameArabic}
          </ArabicText>
        ) : null}
      </Card>

      <SectionHeader title="Aujourd’hui" />
      <View style={styles.row}>
        <Card style={styles.flex} onPress={() => router.push("/memorize")}>
          <AppText variant="title">{s?.memorization.due ?? 0}</AppText>
          <AppText variant="caption" muted>
            versets à réciter
          </AppText>
        </Card>
        <Card
          style={styles.flex}
          onPress={() =>
            (s?.vocabulary.due ?? 0) > 0 ? router.push({ pathname: "/learn/session", params: { review: "1" } }) : router.push("/learn")
          }>
          <AppText variant="title">{s?.vocabulary.due ?? 0}</AppText>
          <AppText variant="caption" muted>
            mots à revoir
          </AppText>
        </Card>
      </View>

      <View style={[styles.reflection, { borderColor: colors.accent }]}>
        <ArabicText size={24} center>
          {VERSE_OF_REFLECTION}
        </ArabicText>
        <AppText variant="caption" muted center>
          Al-Isrâ’ · 17:9
        </AppText>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: spacing.sm, marginTop: spacing.sm },
  goalCard: { flexDirection: "row", alignItems: "center", gap: spacing.xl },
  goalText: { flex: 1, gap: 4 },
  streak: { flexDirection: "row", alignItems: "center", gap: 6 },
  stats: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingHorizontal: spacing.xs },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  resume: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingVertical: spacing.xl },
  resumeCta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md },
  reflection: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: spacing.xl, gap: spacing.sm, marginTop: spacing.md },
});
