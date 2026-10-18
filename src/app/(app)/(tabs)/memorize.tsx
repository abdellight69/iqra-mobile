import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { IconButton } from "@/components/IconButton";
import { ProgressRing } from "@/components/ProgressRing";
import { ScreenHeader } from "@/components/ScreenHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useChapters, useDueVerses, usePlans, useWeakWords } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";
import type { MemorizationPlan } from "@/lib/types";

export default function MemorizeTab() {
  const colors = useColors();
  const plans = usePlans();
  const due = useDueVerses();
  const dueCount = due.data?.length ?? 0;
  const weak = useWeakWords();
  // Versets contenant des mots souvent oubliés, dans l'ordre du Mushaf (10 au plus par séance).
  const weakVerses = [...new Set(weak.data?.map((w) => w.verseKey))]
    .sort((a, b) => {
      const [ca, va] = a.split(":").map(Number) as [number, number];
      const [cb, vb] = b.split(":").map(Number) as [number, number];
      return ca - cb || va - vb;
    })
    .slice(0, 10);

  if (plans.isPending) return <LoadingState />;
  if (plans.isError) return <ErrorState error={plans.error} onRetry={() => void plans.refetch()} />;

  return (
    <SafeAreaView edges={["top"]} style={[styles.flex, { backgroundColor: colors.background }]}>
      <FlatList
        data={plans.data}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
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
            <ScreenHeader
              eyebrow="Hifz"
              title="Mémoriser"
              subtitle="Écoutez, masquez le texte peu à peu, récitez, puis évaluez-vous. Les révisions sont planifiées pour vous."
              right={
                <View style={styles.headerActions}>
                  <IconButton icon="grid-outline" label="Carte de mémorisation" tone="filled" onPress={() => router.push("/memorize/map")} />
                  <IconButton icon="calendar-outline" label="Programmes guidés" tone="filled" onPress={() => router.push("/programs")} />
                  <IconButton icon="add" label="Nouveau plan" tone="primary" onPress={() => router.push("/memorize/new")} />
                </View>
              }
            />
            {dueCount > 0 ? (
              <Card tone="primary" style={styles.due}>
                <View style={styles.flex}>
                  <AppText variant="label" color="#FFFFFF99">
                    Révisions du jour
                  </AppText>
                  <AppText variant="title" color="#FFFFFF">
                    {dueCount} verset{dueCount > 1 ? "s" : ""}
                  </AppText>
                </View>
                <Button title="Réviser" variant="light" size="md" onPress={() => router.push({ pathname: "/memorize/session", params: { due: "1" } })} />
              </Card>
            ) : null}
            {weakVerses.length > 0 ? (
              <Card tone="accent" onPress={() => router.push({ pathname: "/memorize/session", params: { keys: weakVerses.join(",") } })} style={styles.due}>
                <Ionicons name="mic-outline" size={22} color={colors.accent} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">
                    {weak.data!.length} mot{weak.data!.length > 1 ? "s" : ""} à retravailler
                  </AppText>
                  <AppText variant="caption" muted>
                    Oubliés lors de vos vérifications à la voix · {weakVerses.length} verset{weakVerses.length > 1 ? "s" : ""}
                  </AppText>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.accent} />
              </Card>
            ) : null}
            {plans.data.length > 0 ? (
              <AppText variant="label" muted>
                Mes plans
              </AppText>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="leaf-outline"
            title="Commencez votre premier plan"
            message="Une courte sourate est idéale pour débuter, comme Al-Ikhlâs (112) ou Al-Fâtiha (1)."
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
      <ProgressRing value={total ? solid / total : 0} size={56} stroke={4} color={colors.accent}>
        <AppText variant="caption" muted>
          {solid}/{total}
        </AppText>
      </ProgressRing>
      <View style={styles.flex}>
        <AppText variant="headline">{chapter ? chapter.nameSimple : `Sourate ${plan.chapterId}`}</AppText>
        <AppText variant="caption" muted>
          {plan.isWholeChapter
            ? `Sourate entière · ${total} versets`
            : plan.fromVerse === plan.toVerse
              ? `Verset ${plan.fromVerse}`
              : `Versets ${plan.fromVerse} à ${plan.toVerse}`}
          {started > 0 ? ` · ${started} commencé${started > 1 ? "s" : ""}` : ""}
        </AppText>
        {due > 0 ? (
          <View style={styles.dueRow}>
            <Ionicons name="ellipse" size={7} color={colors.danger} />
            <AppText variant="caption" color={colors.danger}>
              {due} à réviser
            </AppText>
          </View>
        ) : null}
      </View>
      {chapter ? <ArabicText size={22}>{chapter.nameArabic}</ArabicText> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl - 4, paddingTop: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 },
  header: { gap: spacing.xl, marginBottom: spacing.md },
  headerActions: { flexDirection: "row", gap: spacing.sm },
  due: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  plan: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  dueRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
});
