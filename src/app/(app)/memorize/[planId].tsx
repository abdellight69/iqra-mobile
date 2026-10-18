import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { ErrorState, LoadingState } from "@/components/States";
import { VerseBadge } from "@/components/VerseBadge";
import { useChapter, useDeletePlan, usePlan } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { PlanVerse } from "@/lib/types";

const STATUS = { new: "Nouveau", learning: "En cours", solid: "Solide" } as const;

function formatDue(verse: PlanVerse): string {
  if (verse.status === "new") return "Pas encore étudié";
  if (verse.due) return "À réviser maintenant";
  const days = Math.max(1, Math.round((Date.parse(verse.dueAt ?? "") - Date.now()) / 86_400_000));
  return `Prochaine révision dans ${days} j`;
}

export default function PlanDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const plan = usePlan(planId);
  const chapter = useChapter(plan.data?.chapterId ?? 0);
  const remove = useDeletePlan();

  if (plan.isPending) return <LoadingState />;
  if (plan.isError) return <ErrorState error={plan.error} onRetry={() => void plan.refetch()} />;
  const p = plan.data;
  const toStudy = p.verses.filter((v) => v.due || v.status === "new").length;

  return (
    <View style={styles.flex}>
      <Stack.Screen
        options={{
          title: chapter.data?.nameSimple ?? "Plan",
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() =>
                Alert.alert("Supprimer ce plan ?", "Votre historique de révision des versets est conservé.", [
                  { text: "Annuler", style: "cancel" },
                  { text: "Supprimer", style: "destructive", onPress: () => remove.mutate(p.id, { onSuccess: () => router.back() }) },
                ])
              }>
              <AppText color={colors.danger}>Supprimer</AppText>
            </Pressable>
          ),
        }}
      />
      <FlatList
        data={p.verses}
        keyExtractor={(v) => v.key}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={
          <Card style={styles.summary}>
            {chapter.data ? <ArabicText size="lg" center>{chapter.data.nameArabic}</ArabicText> : null}
            <AppText center muted>
              {p.isWholeChapter ? "Sourate entière" : `Versets ${p.fromVerse} à ${p.toVerse}`}
            </AppText>
            <ProgressBar value={p.progress.total ? p.progress.solid / p.progress.total : 0} color={colors.accent} />
            <AppText variant="caption" muted center>
              {p.progress.solid} solides · {p.progress.started} commencés · {p.progress.total} au total
            </AppText>
          </Card>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/memorize/session", params: { planId: p.id, verse: String(item.verseNumber) } })}
            style={[styles.verse, { backgroundColor: colors.surface, borderColor: item.due ? colors.danger : colors.border }]}>
            <VerseBadge value={item.verseNumber} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{STATUS[item.status]}</AppText>
              <AppText variant="caption" muted>
                {formatDue(item)}
              </AppText>
            </View>
            <View
              style={[
                styles.dot,
                { backgroundColor: item.status === "solid" ? colors.accent : item.status === "learning" ? colors.primary : colors.border },
              ]}
            />
          </Pressable>
        )}
      />
      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background }]}>
        <Button
          title={toStudy > 0 ? `Étudier (${toStudy} verset${toStudy > 1 ? "s" : ""})` : "S'entraîner sur tout le plan"}
          icon="play"
          onPress={() => router.push({ pathname: "/memorize/session", params: { planId: p.id } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg },
  summary: { gap: spacing.sm, marginBottom: spacing.lg },
  verse: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  cta: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
