import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { StatTile } from "@/components/StatTile";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { type ChildInsights, hasStarted, summarizeSurahs, useChildInsights, verseRange, verseReference, weekBars } from "@/lib/child-insights";
import { localDay } from "@/lib/families-format";
import { useMissionChildren } from "@/lib/missions";
import { useChapters } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Fiche d'un enfant pour le parent : sourates sues, mots appris, mots qui bloquent, activité de la semaine. */
export default function ChildInsightsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insights = useChildInsights(id);
  // Le prénom est déjà connu depuis la liste des enfants : le titre s'affiche sans attendre la fiche.
  const children = useMissionChildren();
  const name = insights.data?.child.displayName ?? children.data?.find((c) => c.id === id)?.displayName ?? null;
  const title = name ? `Ce que ${name} sait` : "";

  if (insights.isPending) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <LoadingState />
      </>
    );
  }
  if (insights.isError) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        <ErrorState error={insights.error} onRetry={() => void insights.refetch()} />
      </>
    );
  }

  const data = insights.data;
  if (!hasStarted(data)) {
    return (
      <>
        <Stack.Screen options={{ title: `Ce que ${data.child.displayName} sait` }} />
        <EmptyState
          icon="leaf-outline"
          title={`${data.child.displayName} n’a pas encore commencé`}
          message="Dès sa première mission, vous verrez ici les sourates et les mots qu’il connaît."
          action={{ title: "Préparer une mission", onPress: () => router.push({ pathname: "/missions/new", params: { childId: data.child.id } }) }}
        />
      </>
    );
  }

  return (
    <Screen edges={[]} onRefresh={() => void insights.refetch()} refreshing={insights.isRefetching}>
      <Stack.Screen options={{ title: `Ce que ${data.child.displayName} sait` }} />
      <Header data={data} />
      <SurahsSection data={data} />
      <WordsSection data={data} />
      <WeakWordsSection data={data} />
      <WeekSection data={data} />
    </Screen>
  );
}

function Header({ data }: { data: ChildInsights }) {
  const colors = useColors();
  const { child, activity, missions } = data;
  return (
    <Card style={styles.gap}>
      <View style={styles.row}>
        <ProfileAvatar name={child.displayName} avatar={child.avatar} size={48} />
        <View style={styles.flex}>
          <AppText variant="title">{child.displayName}</AppText>
          {missions.currentTitle ? (
            <AppText variant="caption" muted>
              Mission en cours : {missions.currentTitle}
            </AppText>
          ) : (
            <AppText variant="caption" muted>
              Pas de mission en cours
            </AppText>
          )}
        </View>
      </View>
      <View style={styles.row}>
        <Stat icon="flame" color={colors.accent} value={activity.streak} label={plural(activity.streak, "jour de suite", "jours de suite")} />
        <Stat icon="star" color={colors.accent} value={missions.stars} label={plural(missions.stars, "étoile", "étoiles")} />
        <Stat icon="checkmark-circle" color={colors.success} value={missions.completedDays} label={plural(missions.completedDays, "mission réussie", "missions réussies")} />
      </View>
    </Card>
  );
}

function Stat({ icon, color, value, label }: { icon: "flame" | "star" | "checkmark-circle"; color: string; value: number; label: string }) {
  return (
    <View style={[styles.flex, styles.stat]}>
      <View style={styles.statValue}>
        <Ionicons name={icon} size={16} color={color} />
        <AppText variant="headline">{value}</AppText>
      </View>
      <AppText variant="caption" muted numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

function SurahsSection({ data }: { data: ChildInsights }) {
  const colors = useColors();
  const chapters = useChapters();
  const surahs = summarizeSurahs(data.surahs, chapters.data);
  return (
    <>
      <SectionHeader title="Sourates" />
      {surahs.length === 0 ? (
        <Card tone="flat">
          <AppText muted>Aucune sourate suivie pour l’instant.</AppText>
        </Card>
      ) : (
        <Card padded={false}>
          {surahs.map((s, i) => (
            <View key={s.chapterId} style={[styles.listRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
              <View style={styles.rowBetween}>
                <AppText variant="bodyStrong" style={styles.flex}>
                  {s.name}
                </AppText>
                {s.recitedOk ? (
                  <View style={[styles.badge, { backgroundColor: colors.successSoft }]}>
                    <Ionicons name="mic" size={12} color={colors.success} />
                    <AppText variant="caption" color={colors.success}>
                      Récitée sans erreur
                    </AppText>
                  </View>
                ) : null}
              </View>
              <ProgressBar value={s.progress} color={s.recitedOk ? colors.success : colors.primary} />
              <AppText variant="caption" muted>
                {s.label}
              </AppText>
            </View>
          ))}
        </Card>
      )}
    </>
  );
}

function WordsSection({ data }: { data: ChildInsights }) {
  const colors = useColors();
  const { words } = data;
  return (
    <>
      <SectionHeader title="Mots" />
      <Card style={styles.gap}>
        <View style={styles.row}>
          <StatTile value={words.learned} label={plural(words.learned, "mot appris", "mots appris")} />
          <StatTile value={words.mastered} label={plural(words.mastered, "mot maîtrisé", "mots maîtrisés")} color={colors.success} />
        </View>
        {words.recent.length > 0 ? (
          <View style={styles.gapSm}>
            <AppText variant="label" muted>
              Derniers mots appris
            </AppText>
            <View style={styles.chips}>
              {words.recent.map((w) => (
                <View key={w.id} style={[styles.wordChip, { backgroundColor: colors.surfaceMuted }]}>
                  <ArabicText size="sm">{w.ar}</ArabicText>
                  <AppText variant="caption" muted numberOfLines={1}>
                    {w.fr}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <AppText variant="caption" muted>
            Les mots des missions apparaîtront ici au fil des jours.
          </AppText>
        )}
      </Card>
    </>
  );
}

function WeakWordsSection({ data }: { data: ChildInsights }) {
  const colors = useColors();
  const chapters = useChapters();
  if (data.weakWords.length === 0) return null;
  return (
    <>
      <SectionHeader title="Mots qui bloquent" />
      <AppText variant="caption" muted>
        Les mots que {data.child.displayName} a le plus souvent oubliés en récitant. Une courte mission sur le verset aide à les fixer.
      </AppText>
      <Card padded={false}>
        {data.weakWords.map((w, i) => {
          const range = verseRange(w.verseKey);
          return (
            <View key={w.location} style={[styles.listRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
              <View style={styles.rowBetween}>
                <View style={styles.flex}>
                  <AppText variant="caption" muted>
                    {verseReference(w.verseKey, chapters.data)} · {plural(w.misses, "oubli", "oublis")}
                  </AppText>
                </View>
                <ArabicText size="md">{w.text}</ArabicText>
              </View>
              {range ? (
                <Button
                  title="En faire une mission"
                  icon="flag-outline"
                  variant="secondary"
                  size="md"
                  onPress={() =>
                    router.push({
                      pathname: "/missions/new",
                      params: { childId: data.child.id, chapterId: String(range.chapterId), fromVerse: String(range.fromVerse), toVerse: String(range.toVerse) },
                    })
                  }
                />
              ) : null}
            </View>
          );
        })}
      </Card>
    </>
  );
}

const BAR_MAX_HEIGHT = 72;

function WeekSection({ data }: { data: ChildInsights }) {
  const colors = useColors();
  const bars = weekBars(data.activity.last7Days, localDay());
  const max = Math.max(1, ...bars.map((b) => b.xp));
  const total = bars.reduce((n, b) => n + b.xp, 0);
  return (
    <>
      <SectionHeader title="Cette semaine" />
      <Card style={styles.gap}>
        <AppText variant="caption" muted>
          {total > 0 ? `${total} XP gagnés sur les sept derniers jours` : "Pas encore d’activité ces sept derniers jours"}
        </AppText>
        <View style={styles.bars} accessibilityRole="image" accessibilityLabel={bars.map((b) => `${b.letter} : ${b.xp} XP`).join(", ")}>
          {bars.map((b) => (
            <View key={b.day} style={styles.barColumn}>
              <View style={[styles.barTrack, { height: BAR_MAX_HEIGHT }]}>
                <View
                  style={[
                    styles.bar,
                    {
                      height: Math.max(b.xp > 0 ? 6 : 3, Math.round((b.xp / max) * BAR_MAX_HEIGHT)),
                      backgroundColor: b.xp > 0 ? (b.today ? colors.accent : colors.primary) : colors.surfaceMuted,
                    },
                  ]}
                />
              </View>
              <AppText variant="caption" color={b.today ? colors.text : colors.textMuted}>
                {b.letter}
              </AppText>
            </View>
          ))}
        </View>
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  gapSm: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  rowBetween: { flexDirection: "row", alignItems: "center", gap: spacing.md, justifyContent: "space-between" },
  stat: { gap: 2 },
  statValue: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  listRow: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  badge: { flexDirection: "row", alignItems: "center", gap: spacing.xs, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  wordChip: { borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, alignItems: "center", maxWidth: 160 },
  bars: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: spacing.sm },
  barColumn: { flex: 1, alignItems: "center", gap: spacing.xs },
  barTrack: { width: "100%", justifyContent: "flex-end" },
  bar: { width: "100%", borderRadius: radius.sm },
});
