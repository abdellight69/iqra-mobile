import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Alert, Pressable, RefreshControl, SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { ProgressRing } from "@/components/ProgressRing";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { useLessons, useStats } from "@/lib/queries";
import { fonts, spacing, useColors } from "@/lib/theme";
import type { LessonSummary } from "@/lib/types";

// Décalage horizontal des étapes pour dessiner un chemin sinueux.
const OFFSETS = [0, 52, 78, 52, 0, -52, -78, -52];

export default function LearnTab() {
  const colors = useColors();
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
        contentContainerStyle={styles.content}
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
          <View style={styles.partHeader}>
            <View style={[styles.rule, { backgroundColor: colors.border }]} />
            <AppText variant="label" color={colors.accent}>
              {section.title}
            </AppText>
            <View style={[styles.rule, { backgroundColor: colors.border }]} />
          </View>
        )}
        renderItem={({ item, index }) => <LessonNode lesson={item} offset={OFFSETS[index % OFFSETS.length] ?? 0} />}
      />
    </SafeAreaView>
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
