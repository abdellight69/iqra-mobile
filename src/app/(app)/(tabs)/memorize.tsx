import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useChapters, useDueVerses, usePlans } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";
import type { MemorizationPlan } from "@/lib/types";

export default function MemorizeTab() {
  const colors = useColors();
  const plans = usePlans();
  const due = useDueVerses();
  const dueCount = due.data?.length ?? 0;

  if (plans.isPending) return <LoadingState />;
  if (plans.isError) return <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />;

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={plans.data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        refreshControl={
          <RefreshControl
            refreshing={plans.isRefetching}
            onRefresh={() => {
              void plans.refetch();
              void due.refetch();
            }}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AppText variant="display">Mémoriser</AppText>
              <Button title="Nouveau" icon="add" size="md" onPress={() => router.push("/memorize/new")} />
            </View>
            <AppText muted>
              Choisissez une sourate ou quelques versets : écoutez, masquez progressivement le texte, récitez, puis évaluez-vous. Les
              révisions sont planifiées automatiquement.
            </AppText>
            {dueCount > 0 ? (
              <Card tone="primary" style={styles.due}>
                <Ionicons name="alarm-outline" size={26} color={colors.accent} />
                <View style={styles.flex}>
                  <AppText variant="heading" color="#FFFFFF">
                    {dueCount} verset{dueCount > 1 ? "s" : ""} à réviser
                  </AppText>
                  <AppText variant="caption" color="#DCEFE8">
                    Toutes sourates confondues
                  </AppText>
                </View>
                <Button
                  title="Réviser"
                  size="md"
                  onPress={() => router.push({ pathname: "/memorize/session", params: { due: "1" } })}
                  style={{ backgroundColor: colors.accent, borderColor: colors.accent }}
                />
              </Card>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="repeat"
            title="Aucun plan de mémorisation"
            message="Commencez par une courte sourate, comme Al-Ikhlâs (112) ou Al-Fâtiha (1)."
            action={{ title: "Créer un plan", onPress: () => router.push("/memorize/new") }}
          />
        }
        renderItem={({ item }) => <PlanCard plan={item} />}
      />
    </SafeAreaView>
  );
}

function PlanCard({ plan }: { plan: MemorizationPlan }) {
  const colors = useColors();
  const chapters = useChapters();
  const chapter = chapters.data?.find((c) => c.id === plan.chapterId);
  const { total, solid, started, due } = plan.progress;

  return (
    <Card onPress={() => router.push({ pathname: "/memorize/[planId]", params: { planId: plan.id } })} style={styles.plan}>
      <View style={styles.planTop}>
        <View style={styles.flex}>
          <AppText variant="heading">{chapter ? `${chapter.id}. ${chapter.nameSimple}` : `Sourate ${plan.chapterId}`}</AppText>
          <AppText variant="caption" muted>
            {plan.isWholeChapter
              ? `Sourate entière · ${total} versets`
              : plan.fromVerse === plan.toVerse
                ? `Verset ${plan.fromVerse}`
                : `Versets ${plan.fromVerse} à ${plan.toVerse}`}
          </AppText>
        </View>
        {chapter ? <ArabicText size="sm">{chapter.nameArabic}</ArabicText> : null}
      </View>
      <ProgressBar value={total ? solid / total : 0} color={colors.accent} />
      <View style={styles.planStats}>
        <AppText variant="caption" muted>
          {solid} solide{solid > 1 ? "s" : ""} · {started} commencé{started > 1 ? "s" : ""} / {total}
        </AppText>
        {due > 0 ? (
          <AppText variant="caption" color={colors.danger}>
            {due} à réviser
          </AppText>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  header: { gap: spacing.md, marginBottom: spacing.lg },
  titleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  due: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  plan: { gap: spacing.md },
  planTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  planStats: { flexDirection: "row", justifyContent: "space-between" },
});
