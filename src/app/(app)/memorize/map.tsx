import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/States";
import { useChapters, useMemorizationMap, usePlans } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { MemorizationMap } from "@/lib/types";

type ChapterProgress = MemorizationMap["chapters"][number];

/** Carte de la mémorisation : les 114 sourates et les 30 juz', colorés selon ce qui est su. */
export default function MemorizationMapScreen() {
  const colors = useColors();
  const map = useMemorizationMap();
  const chapters = useChapters();
  const plans = usePlans();

  if (map.isPending) return <LoadingState />;
  if (map.isError) return <ErrorState error={map.error} onRetry={() => void map.refetch()} />;
  const { totals } = map.data;
  const names = new Map(chapters.data?.map((c) => [c.id, c]) ?? []);

  function open(progress: ChapterProgress) {
    const plan = plans.data?.find((p) => p.chapterId === progress.chapterId);
    if (plan) router.push({ pathname: "/memorize/[planId]", params: { planId: plan.id } });
    else router.push({ pathname: "/memorize/new", params: { chapterId: String(progress.chapterId) } });
  }

  return (
    <Screen edges={[]} onRefresh={() => void map.refetch()} refreshing={map.isRefetching}>
      <View style={styles.totals}>
        <Total value={totals.pagesSolid} of={totals.pages} label="pages maîtrisées" />
        <Total value={totals.juzSolid} of={30} label="juz’ maîtrisés" />
        <Total value={totals.versesSolid} of={totals.verses} label="versets solides" />
      </View>
      <AppText variant="caption" muted>
        Un verset est solide quand sa révision revient dans trois semaines ou plus. Une page ou un juz’ est maîtrisé quand tous ses versets
        sont solides (pages du Mushaf de Médine).
      </AppText>

      <View style={styles.legend}>
        <Legend color={colors.surface} border={colors.border} label="Pas commencé" />
        <Legend color={colors.primarySoft} label="En cours" />
        <Legend color={colors.primary} label="Solide" />
      </View>

      <AppText variant="label" muted>
        Les 30 juz’
      </AppText>
      <View style={styles.juzGrid}>
        {map.data.juzs.map((j) => (
          <View key={j.juz} style={styles.juz}>
            <Cell label={String(j.juz)} tracked={j.tracked} solid={j.solid} total={j.verses} />
          </View>
        ))}
      </View>

      <AppText variant="label" muted>
        Les 114 sourates
      </AppText>
      <View style={styles.surahGrid}>
        {map.data.chapters.map((c) => (
          <Pressable
            key={c.chapterId}
            accessibilityRole="button"
            accessibilityLabel={`${names.get(c.chapterId)?.nameSimple ?? `Sourate ${c.chapterId}`} : ${c.solid} versets solides sur ${c.versesCount}`}
            onPress={() => open(c)}
            style={({ pressed }) => [styles.surah, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <Cell
              label={String(c.chapterId)}
              sublabel={names.get(c.chapterId)?.nameArabic}
              tracked={c.tracked}
              solid={c.solid}
              total={c.versesCount}
              due={c.due}
            />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

function Total({ value, of, label }: { value: number; of: number; label: string }) {
  return (
    <Card style={styles.total}>
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" muted>
        / {of} {label}
      </AppText>
    </Card>
  );
}

function Legend({ color, border, label }: { color: string; border?: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color, borderColor: border ?? color }]} />
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

/** Case colorée : fond selon l'avancement, barre du bas selon la part de versets solides. */
function Cell({ label, sublabel, tracked, solid, total, due = 0 }: { label: string; sublabel?: string; tracked: number; solid: number; total: number; due?: number }) {
  const colors = useColors();
  const complete = total > 0 && solid === total;
  const background = complete ? colors.primary : tracked > 0 ? colors.primarySoft : colors.surface;
  const text = complete ? colors.onPrimary : tracked > 0 ? colors.primary : colors.textMuted;
  return (
    <View style={[styles.cell, { backgroundColor: background, borderColor: tracked > 0 ? background : colors.border }]}>
      <AppText variant="caption" color={text} style={styles.cellLabel}>
        {label}
      </AppText>
      {sublabel ? (
        <ArabicText size={13} center color={text} numberOfLines={1} style={styles.cellName}>
          {sublabel}
        </ArabicText>
      ) : null}
      {tracked > 0 && !complete ? (
        <View style={[styles.bar, { backgroundColor: colors.surface }]}>
          <View style={[styles.barFill, { width: `${(solid / total) * 100}%`, backgroundColor: colors.primary }]} />
        </View>
      ) : null}
      {due > 0 ? <View style={[styles.dueDot, { backgroundColor: colors.accent }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  totals: { flexDirection: "row", gap: spacing.sm },
  total: { flex: 1, gap: 2, paddingVertical: spacing.md },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: StyleSheet.hairlineWidth },
  juzGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  surahGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  surah: { width: "15.2%" },
  juz: { width: "9%" },
  cell: { minWidth: 30, flexGrow: 1, aspectRatio: 1, borderRadius: radius.sm, borderWidth: StyleSheet.hairlineWidth, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  cellLabel: { fontSize: 12, lineHeight: 15 },
  cellName: { lineHeight: 22, paddingHorizontal: 2 },
  bar: { position: "absolute", left: 4, right: 4, bottom: 4, height: 3, borderRadius: 2, overflow: "hidden" },
  barFill: { height: 3 },
  dueDot: { position: "absolute", top: 4, right: 4, width: 6, height: 6, borderRadius: 3 },
});
