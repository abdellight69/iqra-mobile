import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { ProgressRing } from "@/components/ProgressRing";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { useAlphabet } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { AlphabetLessonSummary } from "@/lib/types";

const start = (lessonId: string) => router.push({ pathname: "/reading/session", params: { lessonId } });

export default function ReadingCourse() {
  const colors = useColors();
  const overview = useAlphabet();
  if (overview.isPending) return <LoadingState />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;
  const { units, completedCount, lessonCount, nextLessonId, letters } = overview.data;
  const lessons = units.flatMap((u) => u.lessons);
  const next = lessons.find((l) => l.id === nextLessonId);

  return (
    <Screen onRefresh={() => void overview.refetch()} refreshing={overview.isRefetching}>
      <ScreenHeader eyebrow="Apprendre à lire" title="Lire le Coran" subtitle="Des lettres aux premières sourates : chaque son est illustré par un mot du Coran, avec sa récitation." />

      <Card tone="primary" onPress={next ? () => start(next.id) : undefined} style={styles.hero}>
        <ProgressRing value={completedCount / lessonCount} size={72} stroke={5} color={colors.accent} track="#FFFFFF22">
          <AppText variant="bodyStrong" color="#FFFFFF">
            {completedCount}/{lessonCount}
          </AppText>
        </ProgressRing>
        <View style={styles.flex}>
          <AppText variant="label" color="#FFFFFF99">
            {next ? (completedCount === 0 ? "Commencer" : "Continuer") : "Parcours terminé"}
          </AppText>
          <AppText variant="title" color="#FFFFFF">
            {next ? next.title : "Bâraka Allâhou fîk !"}
          </AppText>
          <AppText variant="caption" color="#FFFFFFCC">
            {next ? next.summary : "Vous pouvez refaire chaque leçon quand vous voulez."}
          </AppText>
        </View>
        {next ? <Ionicons name="arrow-forward" size={20} color="#FFFFFF" /> : null}
      </Card>

      <Card onPress={() => router.push("/reading/alphabet")} style={styles.alphabet}>
        <View style={styles.flex}>
          <AppText variant="headline">L’alphabet</AppText>
          <AppText variant="caption" muted>
            Les {letters.length - 3} lettres, leurs formes et leur son
          </AppText>
        </View>
        <ArabicText size={28} color={colors.accent}>
          ا ب ت ث
        </ArabicText>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Card>

      {units.map((unit) => (
        <View key={unit.id} style={styles.unit}>
          <AppText variant="label" color={colors.accent}>
            {unit.id}. {unit.title}
          </AppText>
          <Card padded={false}>
            {unit.lessons.map((lesson, i) => (
              <LessonRow key={lesson.id} lesson={lesson} current={lesson.id === nextLessonId} first={i === 0} />
            ))}
          </Card>
        </View>
      ))}
    </Screen>
  );
}

/** Les leçons de lettres ont pour titre les lettres elles-mêmes : affichées en arabe. */
const isArabicTitle = (title: string) => /^[؀-ۿ\s]+$/.test(title);

function LessonRow({ lesson, current, first }: { lesson: AlphabetLessonSummary; current: boolean; first: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${lesson.title}, ${lesson.summary}${lesson.completed ? ", terminée" : ""}`}
      onPress={() => start(lesson.id)}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
        pressed && { backgroundColor: colors.surfaceMuted },
      ]}>
      <View
        style={[
          styles.status,
          { backgroundColor: lesson.completed ? colors.accentSoft : current ? colors.primary : colors.surfaceMuted },
        ]}>
        <Ionicons
          name={lesson.completed ? "checkmark" : current ? "play" : "ellipse-outline"}
          size={16}
          color={lesson.completed ? colors.accent : current ? colors.onPrimary : colors.textFaint}
        />
      </View>
      <View style={styles.flex}>
        {isArabicTitle(lesson.title) ? (
          <ArabicText size={24} style={styles.arabicTitle}>
            {lesson.title}
          </ArabicText>
        ) : (
          <AppText variant="bodyStrong">{lesson.title}</AppText>
        )}
        <AppText variant="caption" muted>
          {lesson.summary}
          {lesson.bestScore !== null ? ` · ${lesson.bestScore}%` : ""}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingVertical: spacing.xl },
  alphabet: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  unit: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: radius.lg },
  status: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  arabicTitle: { textAlign: "left", lineHeight: 60 },
});
