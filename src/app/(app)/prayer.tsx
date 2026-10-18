import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { type ComponentProps } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { errorMessage } from "@/lib/api";
import { PRAYER_PATH } from "@/lib/prayer-path";
import { useChapters, useComprehension, useCreatePlan, usePlans } from "@/lib/queries";
import { useReaderSettings } from "@/lib/reader-store";
import { radius, spacing, useColors } from "@/lib/theme";
import type { Chapter, ChapterComprehension, MemorizationPlan } from "@/lib/types";

const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

export default function PrayerPath() {
  const colors = useColors();
  const chapters = useChapters();
  const comprehension = useComprehension();
  const plans = usePlans();

  const steps = PRAYER_PATH.map((chapterId) => {
    const plan = plans.data?.find((p) => p.chapterId === chapterId && p.isWholeChapter);
    return {
      chapterId,
      chapter: chapters.data?.find((c) => c.id === chapterId),
      comprehension: comprehension.data?.find((c) => c.chapterId === chapterId),
      plan,
      memorized: Boolean(plan && plan.progress.total > 0 && plan.progress.solid === plan.progress.total),
    };
  });
  const memorized = steps.filter((s) => s.memorized).length;

  return (
    <Screen
      refreshing={comprehension.isRefetching || plans.isRefetching}
      onRefresh={() => {
        void comprehension.refetch();
        void plans.refetch();
      }}>
      <ScreenHeader
        eyebrow="Parcours"
        title="Comprendre sa prière"
        subtitle="Al-Fâtiha et les dix dernières sourates du Coran : lisez-les mot à mot, apprenez leur vocabulaire, puis mémorisez-les."
      />
      <View style={styles.summary}>
        <View style={styles.summaryText}>
          <AppText variant="bodyStrong">
            {memorized} sur {steps.length} sourates mémorisées
          </AppText>
        </View>
        <ProgressBar value={memorized / steps.length} color={colors.accent} />
      </View>

      <View>
        {steps.map((step, i) => (
          <PathStep key={step.chapterId} index={i} last={i === steps.length - 1} {...step} />
        ))}
      </View>
    </Screen>
  );
}

type StepProps = {
  index: number;
  last: boolean;
  chapterId: number;
  chapter?: Chapter;
  comprehension?: ChapterComprehension;
  plan?: MemorizationPlan;
  memorized: boolean;
};

function PathStep({ index, last, chapterId, chapter, comprehension, plan, memorized }: StepProps) {
  const colors = useColors();
  const createPlan = useCreatePlan();
  const known = comprehension ? percent(comprehension.knownWords, comprehension.totalWords) : 0;
  const allKnown = Boolean(comprehension && comprehension.coveredByBook > 0 && comprehension.knownWords >= comprehension.coveredByBook);

  function read() {
    useReaderSettings.setState({ showWordByWord: true });
    router.push({ pathname: "/surah/[id]", params: { id: String(chapterId) } });
  }

  function memorize() {
    if (plan) return router.push({ pathname: "/memorize/[planId]", params: { planId: plan.id } });
    createPlan.mutate(
      { chapterId },
      {
        onSuccess: ({ plan: created }) => router.push({ pathname: "/memorize/[planId]", params: { planId: created.id } }),
        onError: (error) => Alert.alert("Création du plan impossible", errorMessage(error)),
      },
    );
  }

  return (
    <View style={styles.step}>
      <View style={styles.rail}>
        <View
          style={[
            styles.dot,
            { borderColor: memorized ? colors.accent : colors.border, backgroundColor: memorized ? colors.accent : colors.surface },
          ]}>
          {memorized ? (
            <Ionicons name="checkmark" size={16} color={colors.onPrimary} />
          ) : (
            <AppText variant="caption" muted>
              {index + 1}
            </AppText>
          )}
        </View>
        {last ? null : <View style={[styles.line, { backgroundColor: colors.border }]} />}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.flex}>
            <AppText variant="headline">{chapter?.nameSimple ?? `Sourate ${chapterId}`}</AppText>
            <AppText variant="caption" muted>
              Sourate {chapterId}
              {chapter ? ` · ${chapter.versesCount} versets` : ""}
              {comprehension ? ` · ${known} % des mots reconnus` : ""}
            </AppText>
          </View>
          {chapter ? <ArabicText size={24}>{chapter.nameArabic}</ArabicText> : null}
        </View>
        <View style={styles.actions}>
          <Action icon="book-outline" label="Lire" hint="Lire mot à mot" onPress={read} />
          <Action
            icon={allKnown ? "checkmark-circle" : "sparkles-outline"}
            label="Mots"
            hint="Apprendre les mots de cette sourate"
            done={allKnown}
            onPress={() => router.push({ pathname: "/learn/session", params: { chapterId: String(chapterId) } })}
          />
          <Action
            icon={memorized ? "checkmark-circle" : "repeat-outline"}
            label={plan && !memorized ? `${plan.progress.solid}/${plan.progress.total}` : "Mémoriser"}
            done={memorized}
            loading={createPlan.isPending}
            onPress={memorize}
          />
        </View>
      </View>
    </View>
  );
}

function Action({
  icon,
  label,
  onPress,
  done,
  loading,
  hint,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  done?: boolean;
  loading?: boolean;
  hint?: string;
}) {
  const colors = useColors();
  const tint = done ? colors.accent : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ?? label}
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { backgroundColor: done ? colors.accentSoft : colors.primarySoft, opacity: pressed || loading ? 0.6 : 1 }]}>
      <Ionicons name={icon} size={16} color={tint} />
      <AppText variant="caption" color={tint} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  summary: { gap: spacing.sm },
  summaryText: { flexDirection: "row", justifyContent: "space-between" },
  step: { flexDirection: "row", gap: spacing.md },
  rail: { alignItems: "center", width: 30 },
  dot: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, alignItems: "center", justifyContent: "center", marginTop: spacing.lg },
  line: { width: 1.5, flex: 1, marginVertical: 4 },
  card: { flex: 1, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.md, marginBottom: spacing.md },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  actions: { flexDirection: "row", gap: spacing.xs },
  action: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, paddingVertical: spacing.sm, borderRadius: radius.pill },
});
