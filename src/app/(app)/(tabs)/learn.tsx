import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useBottomTabBarHeight } from "expo-router/js-tabs";
import { useMemo, type ComponentProps } from "react";
import { Alert, Pressable, RefreshControl, SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { ProgressRing } from "@/components/ProgressRing";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { useChapters, useCourse, useLessons, useStats, useThemes } from "@/lib/queries";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { CourseChapter, LessonSummary, ThemeSummary } from "@/lib/types";

// Décalage horizontal des étapes pour dessiner un chemin sinueux.
const OFFSETS = [0, 52, 78, 52, 0, -52, -78, -52];

export default function LearnTab() {
  const colors = useColors();
  const tabBarHeight = useBottomTabBarHeight();
  const lessons = useLessons();
  const stats = useStats();

  const sections = useMemo(() => {
    const byPart = new Map<string, LessonSummary[]>();
    for (const lesson of lessons.data ?? []) byPart.set(lesson.part, [...(byPart.get(lesson.part) ?? []), lesson]);
    return [...byPart.entries()].map(([title, data]) => ({ title, data }));
  }, [lessons.data]);

  const total = lessons.data?.reduce((n, l) => n + l.wordCount, 0) ?? 0;
  const learned = lessons.data?.reduce((n, l) => n + l.learnedCount, 0) ?? 0;
  const due = stats.data?.vocabulary.due ?? 0;

  if (lessons.isPending) return <LoadingState />;
  if (lessons.isError) return <ErrorState error={lessons.error} onRetry={() => void lessons.refetch()} />;

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: colors.background }]}>
      <SectionList
        sections={sections}
        keyExtractor={(l) => l.id}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl + tabBarHeight }]}
        refreshControl={<RefreshControl refreshing={lessons.isRefetching} onRefresh={() => void lessons.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <ScreenHeader
              eyebrow="80% des mots du Qour’ân"
              title="Vocabulaire"
              subtitle="Les mots les plus fréquents du Coran, fiche après fiche."
            />
            <Card style={styles.summary}>
              <View style={styles.summaryRow}>
                <View style={styles.flex}>
                  <AppText variant="title">
                    {learned}
                    <AppText variant="headline" muted>
                      {" "}/ {total}
                    </AppText>
                  </AppText>
                  <AppText variant="caption" muted>
                    mots appris
                  </AppText>
                </View>
                <View style={styles.streak}>
                  <Ionicons name="flame" size={15} color={colors.accent} />
                  <AppText variant="bodyStrong">{stats.data?.currentStreak ?? 0}</AppText>
                </View>
              </View>
              <ProgressBar value={total ? learned / total : 0} color={colors.accent} />
              {due > 0 ? (
                <Button
                  title={`Réviser ${due} mot${due > 1 ? "s" : ""}`}
                  icon="refresh"
                  size="md"
                  onPress={() => router.push({ pathname: "/learn/session", params: { review: "1" } })}
                />
              ) : (
                <AppText variant="caption" faint>
                  Aucune révision en attente : continuez le parcours.
                </AppText>
              )}
            </Card>
            <CourseSection />
            <ThemesSection />
            <Card tone="primary" onPress={() => router.push("/reading")} style={styles.prayer}>
              <AppText style={styles.readingGlyph} color="#E9D9B0">
                اقْرَأْ
              </AppText>
              <View style={styles.flex}>
                <AppText variant="bodyStrong" color="#FFFFFF">
                  Apprendre à lire l’arabe
                </AppText>
                <AppText variant="caption" color="#FFFFFFCC">
                  Les lettres, les voyelles, puis vos premières sourates
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </Card>
            <Card tone="accent" onPress={() => router.push("/prayer")} style={styles.prayer}>
              <Ionicons name="moon-outline" size={20} color={colors.accent} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">Comprendre sa prière</AppText>
                <AppText variant="caption" muted>
                  Le vocabulaire d’Al-Fâtiha et des dix dernières sourates
                </AppText>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.accent} />
            </Card>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View>
            {sections[0] === section ? (
              <View style={styles.bookHeader}>
                <AppText variant="headline">Les fiches du livre</AppText>
                <AppText variant="caption" muted>
                  Les 47 fiches de « 80% des mots du Qour’ân », consultables dans n’importe quel ordre.
                </AppText>
              </View>
            ) : null}
            <View style={styles.partHeader}>
              <View style={[styles.rule, { backgroundColor: colors.border }]} />
              <AppText variant="label" color={colors.accent}>
                {section.title}
              </AppText>
              <View style={[styles.rule, { backgroundColor: colors.border }]} />
            </View>
          </View>
        )}
        renderItem={({ item, index }) => <LessonNode lesson={item} offset={OFFSETS[index % OFFSETS.length] ?? 0} />}
      />
    </SafeAreaView>
  );
}

/** Le parcours « Comprendre une sourate » : les sourates ouvertes et la prochaine à débloquer. */
function CourseSection() {
  const colors = useColors();
  const course = useCourse();
  const chapters = useChapters();
  if (!course.data) return null;
  const firstLocked = course.data.findIndex((c) => !c.unlocked);
  const shown = course.data.slice(0, firstLocked === -1 ? course.data.length : firstLocked + 1);
  return (
    <View style={styles.course}>
      <View>
        <AppText variant="headline">Votre parcours</AppText>
        <AppText variant="caption" muted>
          Comprendre une sourate après l’autre, en commençant par celles que l’on récite.
        </AppText>
      </View>
      {shown.map((chapter) => (
        <CourseRow key={chapter.chapterId} chapter={chapter} name={chapters.data?.find((c) => c.id === chapter.chapterId)} colors={colors} />
      ))}
    </View>
  );
}

/** Les thèmes : une grille de cartes (nombres, corps humain…), chacune avec sa progression. */
function ThemesSection() {
  const colors = useColors();
  const themes = useThemes();
  if (!themes.data?.length) return null;
  return (
    <View style={styles.course}>
      <View>
        <AppText variant="headline">Par thème</AppText>
        <AppText variant="caption" muted>
          Les mots du Coran regroupés par sujet, avec leurs versets.
        </AppText>
      </View>
      <View style={styles.themeGrid}>
        {themes.data.map((theme) => (
          <ThemeCard key={theme.id} theme={theme} colors={colors} />
        ))}
      </View>
    </View>
  );
}

function ThemeCard({ theme, colors }: { theme: ThemeSummary; colors: ReturnType<typeof useColors> }) {
  const ratio = theme.wordCount ? theme.learnedCount / theme.wordCount : 0;
  const done = theme.wordCount > 0 && theme.learnedCount >= theme.wordCount;
  return (
    <Card onPress={() => router.push({ pathname: "/learn/theme/[themeId]", params: { themeId: theme.id } })} style={styles.themeCard}>
      <View style={[styles.themeIcon, { backgroundColor: done ? colors.successSoft : colors.accentSoft }]}>
        <Ionicons name={(theme.icon ?? "pricetag-outline") as ComponentProps<typeof Ionicons>["name"]} size={22} color={done ? colors.success : colors.accent} />
      </View>
      <AppText variant="bodyStrong" numberOfLines={2}>
        {theme.title}
      </AppText>
      <AppText variant="caption" muted>
        {theme.learnedCount}/{theme.wordCount} mots
      </AppText>
      <ProgressBar value={ratio} height={4} color={done ? colors.success : colors.accent} />
    </Card>
  );
}

function CourseRow({ chapter, name, colors }: { chapter: CourseChapter; name?: { nameSimple: string; nameArabic: string }; colors: ReturnType<typeof useColors> }) {
  const ratio = chapter.totalWords ? chapter.knownWords / chapter.totalWords : 0;
  const words = Math.min(chapter.missingWords, 6);
  const detail = chapter.done
    ? "Sourate comprise"
    : chapter.unlocked
      ? `${chapter.missingWords} mot${chapter.missingWords > 1 ? "s" : ""} manquant${chapter.missingWords > 1 ? "s" : ""}${chapter.nextVerse ? ` · verset ${chapter.nextVerse}` : ""}`
      : "Se débloque avec la sourate précédente";
  return (
    <Card
      padded={false}
      onPress={() =>
        chapter.unlocked
          ? router.push({ pathname: "/learn/session", params: { chapterId: String(chapter.chapterId) } })
          : Alert.alert("Sourate verrouillée", "Comprenez d’abord 80 % de la sourate précédente.")
      }
      style={[styles.courseRow, !chapter.unlocked && { opacity: 0.6 }]}>
      <ProgressRing value={ratio} size={56} stroke={4} color={chapter.done ? colors.success : colors.accent} track={colors.surfaceMuted}>
        {chapter.done ? <Ionicons name="checkmark" size={20} color={colors.success} /> : <AppText variant="caption">{Math.round(ratio * 100)}%</AppText>}
      </ProgressRing>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{name?.nameSimple ?? `Sourate ${chapter.chapterId}`}</AppText>
        <AppText variant="caption" muted>
          {detail}
        </AppText>
      </View>
      {chapter.unlocked && !chapter.done ? (
        <View style={[styles.courseAction, { backgroundColor: colors.primary }]}>
          <AppText variant="caption" color={colors.onPrimary}>
            {words} mot{words > 1 ? "s" : ""}
          </AppText>
        </View>
      ) : name?.nameArabic ? (
        <AppText style={styles.courseArabic} color={colors.textMuted}>
          {name.nameArabic}
        </AppText>
      ) : (
        <Ionicons name={chapter.unlocked ? "chevron-forward" : "lock-closed"} size={16} color={colors.textFaint} />
      )}
    </Card>
  );
}

function LessonNode({ lesson, offset }: { lesson: LessonSummary; offset: number }) {
  const colors = useColors();
  const ratio = lesson.wordCount ? lesson.learnedCount / lesson.wordCount : 0;
  const current = lesson.unlocked && !lesson.completed;
  const fill = !lesson.unlocked ? colors.surfaceMuted : lesson.completed ? colors.accentSoft : colors.primary;
  const iconColor = !lesson.unlocked ? colors.textFaint : lesson.completed ? colors.accent : colors.onPrimary;
  const icon = !lesson.unlocked ? "lock-closed" : lesson.completed ? "checkmark" : "play";

  return (
    <View style={[styles.nodeWrap, { transform: [{ translateX: offset }] }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${lesson.title}${lesson.unlocked ? "" : ", verrouillée"}`}
        onPress={() =>
          lesson.unlocked
            ? router.push({ pathname: "/learn/[lessonId]", params: { lessonId: lesson.id } })
            : Alert.alert("Leçon verrouillée", "Terminez la leçon précédente pour débloquer celle-ci.")
        }
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.94 : 1 }] })}>
        <ProgressRing value={lesson.unlocked ? ratio : 0} size={80} stroke={3} color={colors.accent} track={current ? colors.primarySoft : "transparent"}>
          <View style={[styles.node, { backgroundColor: fill }]}>
            <Ionicons name={icon} size={current ? 24 : 22} color={iconColor} />
          </View>
        </ProgressRing>
      </Pressable>
      {/* Titres reproduits tels qu'imprimés dans le livre (en capitales), sans la lettre d'ordre. */}
      <AppText variant="label" center numberOfLines={2} color={lesson.unlocked ? colors.text : colors.textFaint} style={styles.nodeTitle}>
        {lesson.title.replace(/^[A-Z] - /, "")}
      </AppText>
      {lesson.unlocked ? (
        <AppText variant="caption" muted center>
          {lesson.learnedCount}/{lesson.wordCount} mots{lesson.bestScore ? ` · ${lesson.bestScore}%` : ""}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  prayer: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  course: { gap: spacing.md },
  themeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  themeCard: { width: "47%", flexGrow: 1, gap: spacing.xs },
  themeIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  courseRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md },
  courseAction: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill },
  courseArabic: { fontFamily: fonts.arabic, fontSize: 20, lineHeight: 34 },
  bookHeader: { gap: 4, marginTop: spacing.xl },
  readingGlyph: { fontFamily: fonts.arabic, fontSize: 26, lineHeight: 48 },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl - 4, paddingBottom: spacing.xxxl, paddingTop: spacing.lg },
  header: { gap: spacing.xl, marginBottom: spacing.md },
  summary: { gap: spacing.lg },
  summaryRow: { flexDirection: "row", alignItems: "flex-end" },
  streak: { flexDirection: "row", alignItems: "center", gap: 4 },
  partHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.xl },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
  nodeWrap: { alignItems: "center", marginBottom: spacing.xl, gap: 4 },
  node: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center" },
  nodeTitle: { maxWidth: 230, marginTop: spacing.sm, fontSize: 12, lineHeight: 16 },
});
