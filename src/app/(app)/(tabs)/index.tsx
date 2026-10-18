import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionHeader } from "@/components/SectionHeader";
import { StatTile } from "@/components/StatTile";
import { useAuth } from "@/lib/auth-store";
import { useChapters, useMe, useReadingPosition, useStats } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

function greeting(): string {
  const hour = new Date().getHours();
  return hour < 5 ? "Bonne nuit" : hour < 18 ? "Bonjour" : "Bonsoir";
}

export default function Home() {
  const colors = useColors();
  const me = useMe();
  const userName = useAuth((s) => s.user?.displayName);
  const stats = useStats();
  const position = useReadingPosition();
  const chapters = useChapters();
  const s = stats.data;
  const lastChapter = position.data ? chapters.data?.find((c) => c.id === position.data?.chapterId) : undefined;

  const refreshing = stats.isRefetching || position.isRefetching;
  const refresh = () => {
    void stats.refetch();
    void position.refetch();
    void me.refetch();
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
        <View>
          <AppText muted>Assalamou alaykoum</AppText>
          <AppText variant="display">
            {greeting()}
            {userName ? `, ${userName}` : ""}
          </AppText>
        </View>

        <Card tone="primary" style={styles.goal}>
          <View style={styles.goalHeader}>
            <View>
              <AppText variant="label" color={colors.accentSoft}>
                Objectif du jour
              </AppText>
              <AppText variant="title" color="#FFFFFF">
                {s ? `${s.today.xp} / ${s.today.goalXp} XP` : "—"}
              </AppText>
            </View>
            <View style={[styles.streak, { backgroundColor: "#FFFFFF22" }]}>
              <Ionicons name="flame" size={18} color={colors.accent} />
              <AppText variant="bodyStrong" color="#FFFFFF">
                {s?.currentStreak ?? 0} j
              </AppText>
            </View>
          </View>
          <ProgressBar value={s ? s.today.xp / s.today.goalXp : 0} color={colors.accent} />
        </Card>

        <View style={styles.row}>
          <StatTile icon="star" value={s?.xp ?? 0} label="XP au total" color={colors.accent} />
          <StatTile icon="school" value={s?.vocabulary.learned ?? 0} label="Mots appris" />
          <StatTile icon="repeat" value={s?.memorization.verses ?? 0} label="Versets" />
        </View>

        <SectionHeader title="Reprendre" />
        <Card
          onPress={() =>
            router.push({
              pathname: "/surah/[id]",
              params: { id: String(position.data?.chapterId ?? 1), verse: String(position.data?.verseNumber ?? 1) },
            })
          }>
          <View style={styles.resume}>
            <View style={[styles.badge, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="book" size={22} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{lastChapter ? `Sourate ${lastChapter.nameSimple}` : "Commencer la lecture"}</AppText>
              <AppText muted variant="caption">
                {position.data ? `Verset ${position.data.verseNumber}` : "Al-Fatiha, l'Ouverture"}
              </AppText>
            </View>
            {lastChapter ? <ArabicText size="sm">{lastChapter.nameArabic}</ArabicText> : null}
          </View>
        </Card>

        <SectionHeader title="À réviser aujourd’hui" />
        <View style={styles.row}>
          <Card style={styles.flex} onPress={() => router.push("/memorize")}>
            <Ionicons name="repeat" size={22} color={colors.primary} />
            <AppText variant="title">{s?.memorization.due ?? 0}</AppText>
            <AppText muted variant="caption">
              versets à réciter
            </AppText>
          </Card>
          <Card
            style={styles.flex}
            onPress={() =>
              (s?.vocabulary.due ?? 0) > 0 ? router.push({ pathname: "/learn/session", params: { review: "1" } }) : router.push("/learn")
            }>
            <Ionicons name="layers" size={22} color={colors.accent} />
            <AppText variant="title">{s?.vocabulary.due ?? 0}</AppText>
            <AppText muted variant="caption">
              mots à revoir
            </AppText>
          </Card>
        </View>

        <Card tone="accent">
          <ArabicText size="md" center>
            إِنَّ هَٰذَا ٱلْقُرْءَانَ يَهْدِى لِلَّتِى هِىَ أَقْوَمُ وَيُبَشِّرُ ٱلْمُؤْمِنِينَ ٱلَّذِينَ يَعْمَلُونَ ٱلصَّٰلِحَٰتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا
          </ArabicText>
          <AppText center muted variant="caption">
            Sourate Al-Isrâ’, verset 9 (17:9) — texte uthmani (Tanzil)
          </AppText>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  goal: { gap: spacing.md },
  goalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  streak: { flexDirection: "row", alignItems: "center", gap: spacing.xs, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.pill },
  row: { flexDirection: "row", gap: spacing.md },
  resume: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  badge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});
