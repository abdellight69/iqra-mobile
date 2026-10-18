import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useMemo } from "react";
import { Alert, Pressable, RefreshControl, SectionList, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { ErrorState, LoadingState } from "@/components/States";
import { useLessons, useStats } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { LessonSummary } from "@/lib/types";

// Décalage horizontal des étapes pour dessiner un chemin sinueux.
const OFFSETS = [0, 46, 70, 46, 0, -46, -70, -46];

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
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={lessons.isRefetching} onRefresh={() => void lessons.refetch()} tintColor={colors.primary} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="display">Vocabulaire</AppText>
            <AppText muted>
              Les mots les plus fréquents du Coran, fiche par fiche, d’après « 80% des mots du Qour’ân ».
            </AppText>
            <Card style={styles.summary}>
              <View style={styles.summaryRow}>
                <AppText variant="bodyStrong">
                  {learned} / {total} mots appris
                </AppText>
                <View style={styles.streak}>
                  <Ionicons name="flame" size={16} color={colors.accent} />
                  <AppText variant="bodyStrong">{stats.data?.currentStreak ?? 0}</AppText>
                </View>
              </View>
              <ProgressBar value={total ? learned / total : 0} />
              <Button
                title={due > 0 ? `Réviser ${due} mot${due > 1 ? "s" : ""}` : "Aucune révision en attente"}
                icon="refresh"
                variant={due > 0 ? "primary" : "secondary"}
                disabled={due === 0}
                size="md"
                onPress={() => router.push({ pathname: "/learn/session", params: { review: "1" } })}
              />
            </Card>
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={[styles.partHeader, { backgroundColor: colors.accentSoft }]}>
            <AppText variant="label" color={colors.primaryStrong}>
              {section.title}
            </AppText>
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
  const background = !lesson.unlocked ? colors.surfaceMuted : lesson.completed ? colors.accent : colors.primary;
  const icon = !lesson.unlocked ? "lock-closed" : lesson.completed ? "checkmark" : "star";

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
        style={({ pressed }) => [
          styles.node,
          { backgroundColor: background, borderColor: lesson.unlocked ? colors.primaryStrong : colors.border, transform: [{ scale: pressed ? 0.94 : 1 }] },
        ]}>
        <Ionicons name={icon} size={30} color={lesson.unlocked ? "#FFFFFF" : colors.textMuted} />
      </Pressable>
      <AppText variant="bodyStrong" center numberOfLines={2} style={styles.nodeTitle}>
        {lesson.title.replace(/^[A-Z] - /, "")}
      </AppText>
      {lesson.unlocked ? (
        <AppText variant="caption" muted center>
          {lesson.learnedCount}/{lesson.wordCount} mots{lesson.bestScore ? ` · ${lesson.bestScore}%` : ""}
        </AppText>
      ) : null}
      {lesson.unlocked && ratio > 0 && ratio < 1 ? (
        <View style={styles.nodeProgress}>
          <ProgressBar value={ratio} height={5} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl * 2 },
  header: { gap: spacing.sm, marginBottom: spacing.lg },
  summary: { gap: spacing.md, marginTop: spacing.sm },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  streak: { flexDirection: "row", alignItems: "center", gap: 4 },
  partHeader: { alignSelf: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.pill, marginVertical: spacing.lg },
  nodeWrap: { alignItems: "center", marginBottom: spacing.xl, gap: 4 },
  node: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center", borderBottomWidth: 6 },
  nodeTitle: { maxWidth: 220, marginTop: spacing.xs },
  nodeProgress: { width: 90 },
});
