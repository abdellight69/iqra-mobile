import Ionicons from "@expo/vector-icons/Ionicons";
import { type Href, router } from "expo-router";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
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
import { track } from "@/lib/events";
import { nextStep } from "@/lib/next-step";
import { nextMilestone, nextPlanStep, type Plan, planSteps, progressLabel, progressRatio, remainingMinutes, usePlan } from "@/lib/plan";
import { DAY_LETTERS, useWeek, weekdayIndex, weekHeadline } from "@/lib/week";
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
  // Le plan personnel (serveur) ; à défaut (hors ligne sans copie, serveur plus ancien), la prochaine action calculée ici.
  const plan = usePlan();
  const week = useWeek(0);
  const fallbackStep = plan.data ? null : nextStep(me.data?.goal, { programs: programs.data, lessons: lessons.data, stats: stats.data, course: course.data, chapters: chapters.data });
  useEffect(() => {
    if (plan.data) track("plan_viewed", { goal: plan.data.goal ?? "", percent: Math.round(progressRatio(plan.data.target) * 100) });
    // Une fois par ouverture de l'accueil avec un plan chargé.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.data !== undefined && plan.data !== null]);
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
        void plan.refetch();
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

      {plan.data ? (
        <PlanCard plan={plan.data} />
      ) : fallbackStep ? (
        <Card tone="primary" onPress={() => router.push(fallbackStep.href)} style={styles.resume}>
          <View style={styles.flex}>
            <AppText variant="label" color="#FFFFFF99">
              {fallbackStep.eyebrow}
            </AppText>
            <AppText variant="title" color="#FFFFFF">
              {fallbackStep.title}
            </AppText>
            <AppText variant="caption" color="#FFFFFFCC">
              {fallbackStep.detail}
            </AppText>
          </View>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </Card>
      ) : null}

      {week.data ? <WeekCard week={week.data} /> : null}

      <Card style={styles.goalCard}>
        <ProgressRing value={goal} size={72} stroke={6} color={colors.accent}>
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

      {fallbackStep?.programId && fallbackStep.programId === activeProgram?.id ? null : (
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

      {plan.data ? null : (
        <>
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
        </>
      )}

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

/**
 * Mon plan : la cible choisie au premier lancement et sa progression, puis la séance du jour en une
 * liste courte (mots, versets, lettres, lecture). Un seul grand bouton : la prochaine étape non faite.
 */
function PlanCard({ plan }: { plan: Plan }) {
  const colors = useColors();
  const steps = planSteps(plan);
  const next = nextPlanStep(plan);
  const minutes = remainingMinutes(plan);
  const milestone = nextMilestone(plan);
  const ratio = progressRatio(plan.target);
  return (
    <Card tone="primary" style={styles.plan}>
      <View style={styles.planHeader}>
        <View style={styles.flex}>
          <AppText variant="label" color="#FFFFFF99">
            Mon plan
          </AppText>
          <AppText variant="title" color="#FFFFFF">
            {plan.target.title}
          </AppText>
          <AppText variant="caption" color="#FFFFFFCC">
            {plan.target.detail}
          </AppText>
        </View>
        <AppText variant="headline" color="#FFFFFF">
          {Math.round(ratio * 100)}%
        </AppText>
      </View>
      <ProgressBar value={ratio} color={colors.accent} track="#FFFFFF33" height={8} />
      <AppText variant="caption" color="#FFFFFFCC">
        {progressLabel(plan.target)}
        {milestone ? ` · prochain jalon : ${milestone}` : " · cible atteinte"}
      </AppText>

      {steps.length > 0 ? (
        <View style={styles.planSteps}>
          {steps.map((step) => (
            <Pressable
              key={step.kind}
              accessibilityRole="button"
              accessibilityLabel={`${step.title}, ${step.detail}`}
              accessibilityState={{ checked: step.done }}
              onPress={() => router.push(step.href)}
              style={({ pressed }) => [styles.planStep, { opacity: pressed ? 0.7 : step.done ? 0.65 : 1 }]}>
              <Ionicons name={step.done ? "checkmark-circle" : "ellipse-outline"} size={22} color={step.done ? colors.accent : "#FFFFFFCC"} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" color="#FFFFFF">
                  {step.title}
                </AppText>
                <AppText variant="caption" color="#FFFFFFCC">
                  {step.detail}
                </AppText>
              </View>
              {!step.done ? (
                <AppText variant="caption" color="#FFFFFF99">
                  {Math.round(step.minutes)} min
                </AppText>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : (
        <AppText variant="caption" color="#FFFFFFCC">
          Rien n’attend aujourd’hui : lisez, ou avancez dans un programme.
        </AppText>
      )}

      {next ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push(next.href)}
          style={({ pressed }) => [styles.planCta, { backgroundColor: "#FFFFFF", opacity: pressed ? 0.85 : 1 }]}>
          <Ionicons name="play" size={18} color={colors.primaryStrong} />
          <AppText variant="bodyStrong" color={colors.primaryStrong}>
            {steps.some((s) => s.done) ? "Continuer la séance du jour" : "Commencer la séance du jour"}
            {minutes > 0 ? ` · ${minutes} min` : ""}
          </AppText>
        </Pressable>
      ) : steps.length > 0 ? (
        <View style={[styles.planCta, { backgroundColor: "#FFFFFF22" }]}>
          <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
          <AppText variant="bodyStrong" color="#FFFFFF">
            Séance du jour terminée
          </AppText>
        </View>
      ) : null}
    </Card>
  );
}

/** Cette semaine : sept pastilles (lundi → dimanche), l'objectif de jours, et le bilan au toucher. */
function WeekCard({ week }: { week: NonNullable<ReturnType<typeof useWeek>["data"]> }) {
  const colors = useColors();
  const todayIndex = weekdayIndex(new Date());
  return (
    <Card onPress={() => router.push("/week" as Href)} style={styles.weekCard} accessibilityLabel={`Cette semaine : ${weekHeadline(week)}. Ouvrir le bilan.`}>
      <View style={styles.flex}>
        <AppText variant="label" muted>
          Cette semaine
        </AppText>
        <AppText variant="bodyStrong">{weekHeadline(week)}</AppText>
        <View style={styles.weekDots}>
          {week.days.map((day, i) => (
            <View key={day.day} style={styles.weekDot}>
              <View
                style={[
                  styles.weekDotDisc,
                  {
                    backgroundColor: day.practiced ? colors.primary : day.frozen ? colors.primarySoft : colors.surfaceMuted,
                    borderColor: i === todayIndex ? colors.accent : "transparent",
                  },
                ]}>
                {day.practiced ? <Ionicons name="checkmark" size={12} color={colors.onPrimary} /> : null}
              </View>
              <AppText variant="caption" color={i === todayIndex ? colors.text : colors.textFaint}>
                {DAY_LETTERS[i]}
              </AppText>
            </View>
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: spacing.sm, marginTop: spacing.sm },
  weekCard: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  weekDots: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  weekDot: { alignItems: "center", gap: 2 },
  weekDotDisc: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  plan: { gap: spacing.md, paddingVertical: spacing.xl },
  planHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  planSteps: { gap: spacing.xs, marginTop: spacing.xs },
  planStep: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 48, paddingVertical: spacing.xs },
  planCta: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm, minHeight: 50, borderRadius: 999, paddingHorizontal: spacing.lg, marginTop: spacing.xs },
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
