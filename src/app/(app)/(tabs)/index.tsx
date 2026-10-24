import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { ProgressRing } from "@/components/ProgressRing";
import { Screen } from "@/components/Screen";
import { SearchBar } from "@/components/SearchBar";
import { SectionHeader } from "@/components/SectionHeader";
import { StatTile } from "@/components/StatTile";
import { KidsHome } from "@/components/kids/KidsHome";
import { useKidsMode } from "@/lib/kids";
import { useAuth } from "@/lib/auth-store";
import { useFamilies, useReceivedInvitations } from "@/lib/families";
import { familiesSummary } from "@/lib/families-format";
import { nextStep } from "@/lib/next-step";
import { useChapters, useComprehension, useLessons, useMe, usePrograms, useReadingPosition, useStats, useCourse } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";
import { buildSnapshot, publishWidgetSnapshot } from "@/lib/widget";

// Texte uthmani de 17:9 tel que dans Tanzil (vérifié), voir backend/data/README.md.
const VERSE_OF_REFLECTION =
  "إِنَّ هَٰذَا ٱلْقُرْءَانَ يَهْدِى لِلَّتِى هِىَ أَقْوَمُ وَيُبَشِّرُ ٱلْمُؤْمِنِينَ ٱلَّذِينَ يَعْمَلُونَ ٱلصَّٰلِحَٰتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا";

/** Salutation, la même à toute heure, dans la graphie phonétique de l'app. */
const GREETING = "As-salâmou ʿalaykoum";

function today(): string {
  const label = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Un profil enfant a son propre accueil : la mission du jour, les étoiles et « Mes mots ». */
export default function HomeTab() {
  return useKidsMode() ? <KidsHome /> : <Home />;
}

function Home() {
  const colors = useColors();
  const me = useMe();
  const userName = useAuth((s) => s.user?.displayName);
  const stats = useStats();
  const position = useReadingPosition();
  const chapters = useChapters();
  const comprehension = useComprehension();
  const programs = usePrograms();
  const activeProgram = programs.data?.find((p) => p.progress && !p.progress.finished);
  const lessons = useLessons();
  const families = useFamilies();
  const invitations = useReceivedInvitations(!me.data?.isChild);
  const invitationCount = invitations.data?.length ?? 0;
  const familyLine = families.data ? familiesSummary(families.data, invitationCount) : null;
  const familyAlert = invitationCount > 0 || (families.data ?? []).some((f) => f.pendingGoals > 0 || f.unseenEncouragements > 0);
  const course = useCourse(me.data?.goal === "understand");
  const step = nextStep(me.data?.goal, { programs: programs.data, lessons: lessons.data, stats: stats.data, course: course.data, chapters: chapters.data });
  const s = stats.data;
  const lastChapter = position.data ? chapters.data?.find((c) => c.id === position.data?.chapterId) : undefined;

  // Widget d'écran d'accueil : instantané de la journée, mis à jour à chaque passage ici.
  useEffect(() => {
    if (!me.data || !stats.data || position.isPending) return;
    void publishWidgetSnapshot(buildSnapshot({ user: me.data, stats: stats.data, position: position.data, chapterName: lastChapter?.nameSimple ?? null }));
  }, [me.data, stats.data, position.isPending, position.data, lastChapter?.nameSimple]);
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
        void programs.refetch();
      }}>
      <View style={styles.header}>
        <AppText variant="label" muted>
          {today()}
        </AppText>
        <AppText variant="display">
          {GREETING}
          {userName ? `,\n${userName}` : ""}
        </AppText>
      </View>
      <SearchBar />

      {step ? (
        <Card tone="primary" onPress={() => router.push(step.href)} style={styles.resume}>
          <View style={styles.flex}>
            <AppText variant="label" color="#FFFFFF99">
              {step.eyebrow}
            </AppText>
            <AppText variant="title" color="#FFFFFF">
              {step.title}
            </AppText>
            <AppText variant="caption" color="#FFFFFFCC">
              {step.detail}
            </AppText>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </Card>
      ) : null}

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
          {s?.streakFreeze?.pending ? (
            <View style={styles.streak}>
              <Ionicons name="snow" size={14} color={colors.primary} />
              <AppText variant="caption" color={colors.primary} style={styles.shrink}>
                Hier manqué : pratiquez aujourd’hui, votre jour de répit garde la série
              </AppText>
            </View>
          ) : s?.streakFreeze?.available ? (
            <View style={styles.streak}>
              <Ionicons name="snow-outline" size={14} color={colors.textMuted} />
              <AppText variant="caption" muted>
                1 jour de répit cette semaine
              </AppText>
            </View>
          ) : null}
        </View>
      </Card>

      <View style={styles.stats}>
        <StatTile value={s?.xp ?? 0} label="XP au total" />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatTile value={s?.vocabulary.learned ?? 0} label="mots appris" />
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <StatTile value={s?.memorization.verses ?? 0} label="versets suivis" />
      </View>

      {familyLine && families.data ? (
        <Card
          tone={familyAlert ? "accent" : "default"}
          onPress={() => (families.data.length === 1 && invitationCount === 0 ? router.push({ pathname: "/famille/[id]", params: { id: families.data[0]!.id } }) : router.push("/famille"))}
          style={styles.resume}>
          <Ionicons name="heart-circle-outline" size={26} color={colors.accent} />
          <View style={styles.flex}>
            <AppText variant="label" muted>
              {families.data.length === 1 && invitationCount === 0 ? families.data[0]!.name : "Mes familles"}
            </AppText>
            <AppText variant="bodyStrong">{familyLine}</AppText>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </Card>
      ) : null}

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

      {/* Cet accueil n'est rendu que pour un adulte : pas de branche enfant ici. */}
      <Card tone="accent" onPress={() => router.push("/prayer")} style={styles.resume}>
        <View style={styles.flex}>
          <AppText variant="label" color={colors.accent}>
            Parcours
          </AppText>
          <AppText variant="headline">Comprendre sa prière</AppText>
          <AppText variant="caption" muted>
            Al-Fâtiha et les dix dernières sourates, mot à mot
          </AppText>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.accent} />
      </Card>

      {step?.programId && step.programId === activeProgram?.id ? null : (
              <Card onPress={() => router.push(activeProgram ? { pathname: "/programs/[id]", params: { id: activeProgram.id } } : "/programs")} style={styles.resume}>
          <View style={styles.flex}>
            <AppText variant="label" muted>
              Programme guidé
            </AppText>
            <AppText variant="headline">{activeProgram ? activeProgram.title : "Avancer pas à pas"}</AppText>
            <AppText variant="caption" muted>
              {activeProgram?.progress?.nextDay
                ? `Jour ${activeProgram.progress.nextDay} sur ${activeProgram.dayCount}`
                : "Juz’ ‘Amma en 60 jours, lecture du Coran en 30 jours…"}
            </AppText>
          </View>
          <Ionicons name="calendar-outline" size={20} color={colors.primary} />
        </Card>
      )}

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
  shrink: { flexShrink: 1 },
  stats: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingHorizontal: spacing.xs },
  statDivider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch" },
  resume: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingVertical: spacing.xl },
  resumeCta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing.sm },
  row: { flexDirection: "row", gap: spacing.md },
  reflection: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: spacing.xl, gap: spacing.sm, marginTop: spacing.md },
});
