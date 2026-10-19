import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { IconButton } from "@/components/IconButton";
import { ProgressRing } from "@/components/ProgressRing";
import { ErrorState, LoadingState } from "@/components/States";
import { VerseBadge } from "@/components/VerseBadge";
import { useChapter, useDeletePlan, usePlan, useRecitationAvailable } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { PlanVerse } from "@/lib/types";

const STATUS = { new: "Nouveau", learning: "En cours", solid: "Solide" } as const;
/** Réussites espacées avant qu'un verset soit « solide » (intervalle SM-2 ≥ 3 semaines : 1 j, 6 j, ~15 j, ~37 j). */
const SOLID_REPETITIONS = 4;

function formatDue(verse: PlanVerse): string {
  if (verse.status === "new") return "Pas encore étudié";
  if (verse.due) return "À réviser maintenant";
  const days = Math.max(1, Math.round((Date.parse(verse.dueAt ?? "") - Date.now()) / 86_400_000));
  return `Prochaine révision dans ${days} j`;
}

/** « 2/4 réussites » tant que le verset n'est pas solide. */
function formatRepetitions(verse: PlanVerse): string | null {
  if (verse.status !== "learning") return null;
  return `${Math.min(verse.repetitions, SOLID_REPETITIONS)}/${SOLID_REPETITIONS} réussites`;
}

export default function PlanDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const plan = usePlan(planId);
  const chapter = useChapter(plan.data?.chapterId ?? 0);
  const remove = useDeletePlan();
  const recitation = useRecitationAvailable();

  if (plan.isPending) return <LoadingState />;
  if (plan.isError) return <ErrorState error={plan.error} onRetry={() => void plan.refetch()} />;
  const p = plan.data;
  const toStudy = p.verses.filter((v) => v.due || v.status === "new").length;
  const memorized = p.progress.total > 0 && p.progress.solid === p.progress.total;
  const statusColor = (v: PlanVerse) => (v.status === "solid" ? colors.accent : v.status === "learning" ? colors.primary : colors.border);

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: "",
          headerRight: () => (
            <IconButton
              icon="trash-outline"
              label="Supprimer ce plan"
              onPress={() =>
                Alert.alert("Supprimer ce plan ?", "Votre historique de révision des versets est conservé.", [
                  { text: "Annuler", style: "cancel" },
                  { text: "Supprimer", style: "destructive", onPress: () => remove.mutate(p.id, { onSuccess: () => router.back() }) },
                ])
              }
            />
          ),
        }}
      />
      <FlatList
        data={p.verses}
        keyExtractor={(v) => v.key}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + (recitation.data ? 170 : 110) }]}
        ItemSeparatorComponent={() => <View style={[styles.separator, { backgroundColor: colors.border }]} />}
        ListHeaderComponent={
          <View style={styles.summary}>
            <ProgressRing value={p.progress.total ? p.progress.solid / p.progress.total : 0} size={120} stroke={5} color={colors.accent}>
              {chapter.data ? <ArabicText size={26} center>{chapter.data.nameArabic}</ArabicText> : null}
            </ProgressRing>
            <AppText variant="title" center>
              {chapter.data?.nameSimple ?? `Sourate ${p.chapterId}`}
            </AppText>
            <AppText muted center>
              {p.isWholeChapter ? "Sourate entière" : p.fromVerse === p.toVerse ? `Verset ${p.fromVerse}` : `Versets ${p.fromVerse} à ${p.toVerse}`}
            </AppText>
            {memorized ? (
              <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
                <AppText variant="caption" color={colors.accent}>
                  {p.isWholeChapter ? "Sourate mémorisée" : "Passage mémorisé"} · tous les versets sont solides
                </AppText>
              </View>
            ) : (
              <AppText variant="caption" muted center>
                Un verset est solide après {SOLID_REPETITIONS} réussites espacées (environ 3 semaines). {p.isWholeChapter ? "La sourate est mémorisée" : "Le passage est mémorisé"} quand tous le sont.
              </AppText>
            )}
            <View style={styles.counts}>
              {[
                { value: p.progress.solid, label: "solides" },
                { value: p.progress.started, label: "commencés" },
                { value: p.progress.total, label: "au total" },
              ].map((c) => (
                <View key={c.label} style={styles.count}>
                  <AppText variant="headline">{c.value}</AppText>
                  <AppText variant="caption" muted>
                    {c.label}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/memorize/session", params: { planId: p.id, verse: String(item.verseNumber) } })}
            style={({ pressed }) => [styles.verse, { opacity: pressed ? 0.55 : 1 }]}>
            <VerseBadge value={item.verseNumber} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">
                {STATUS[item.status]}
                {formatRepetitions(item) ? ` · ${formatRepetitions(item)}` : ""}
              </AppText>
              <AppText variant="caption" color={item.due ? colors.danger : colors.textMuted}>
                {formatDue(item)}
              </AppText>
            </View>
            <View style={[styles.dot, { backgroundColor: statusColor(item) }]} />
          </Pressable>
        )}
      />
      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background }]}>
        {recitation.data ? (
          <Button
            title={p.toVerse - p.fromVerse + 1 > 30 ? `Réciter à voix haute · versets ${p.fromVerse} à ${p.fromVerse + 29}` : "Réciter le plan à voix haute"}
            icon="mic-outline"
            variant="secondary"
            onPress={() =>
              router.push({
                pathname: "/memorize/recite",
                // Au plus 30 versets par vérification (environ 5 minutes de récitation).
                params: { chapterId: String(p.chapterId), from: String(p.fromVerse), to: String(Math.min(p.toVerse, p.fromVerse + 29)) },
              })
            }
          />
        ) : null}
        <Button
          title={toStudy > 0 ? `Étudier · ${toStudy} verset${toStudy > 1 ? "s" : ""}` : "S'entraîner sur tout le plan"}
          onPress={() => router.push({ pathname: "/memorize/session", params: { planId: p.id } })}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, alignSelf: "center" },
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl - 4 },
  summary: { alignItems: "center", gap: spacing.sm, paddingTop: spacing.md, paddingBottom: spacing.xl },
  counts: { flexDirection: "row", gap: spacing.xxl, marginTop: spacing.md },
  count: { alignItems: "center" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 34 + spacing.lg },
  verse: { flexDirection: "row", alignItems: "center", gap: spacing.lg, paddingVertical: spacing.md + 2 },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  cta: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl - 4, paddingTop: spacing.md, gap: spacing.sm },
});
