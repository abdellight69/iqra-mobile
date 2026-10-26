import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { StatTile } from "@/components/StatTile";
import { WeekShareButton } from "@/components/WeekShare";
import { radius, spacing, useColors } from "@/lib/theme";
import { compareWeeks, DAY_LETTERS, useSetWeekGoal, useWeek, WEEK_GOAL_CHOICES, weekdayIndex, weekHeadline, weekLabel, weekMessage, weekSummary } from "@/lib/week";

/** Bilan de la semaine : les jours pratiqués, ce qui a été appris, la comparaison avec la semaine d'avant, l'objectif. */
export default function WeekScreen() {
  const colors = useColors();
  const [offset, setOffset] = useState(0);
  const week = useWeek(offset);
  const setGoal = useSetWeekGoal();

  if (week.isPending) return <LoadingState label="Calcul de la semaine…" />;
  if (week.isError) return <ErrorState error={week.error} onRetry={() => void week.refetch()} />;
  const data = week.data;
  if (!data) return <EmptyState icon="calendar-outline" title="Pas encore disponible" message="Le bilan de la semaine arrive avec la prochaine mise à jour du serveur." />;

  const todayIndex = offset === 0 ? weekdayIndex(new Date()) : 6;
  const maxXp = Math.max(1, ...data.days.map((d) => d.xp));
  const comparison = compareWeeks(data.totals, data.previous);
  const summary = weekSummary(data.totals);

  return (
    <Screen onRefresh={() => void week.refetch()} refreshing={week.isRefetching}>
      <Stack.Screen options={{ title: "Ma semaine" }} />
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" accessibilityLabel="Semaine précédente" hitSlop={8} onPress={() => setOffset((o) => Math.max(-12, o - 1))} style={styles.navButton}>
          <Ionicons name="chevron-back" size={22} color={colors.textMuted} />
        </Pressable>
        <View style={styles.flex}>
          <AppText variant="label" muted center>
            {offset === 0 ? "Cette semaine" : offset === -1 ? "La semaine dernière" : `Il y a ${-offset} semaines`}
          </AppText>
          <AppText variant="headline" center>
            {weekLabel(data.weekStart, data.weekEnd)}
          </AppText>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Semaine suivante" hitSlop={8} disabled={offset === 0} onPress={() => setOffset((o) => Math.min(0, o + 1))} style={[styles.navButton, offset === 0 && { opacity: 0.3 }]}>
          <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      <Card tone={data.goalReached ? "primary" : "default"} style={styles.headline}>
        <AppText variant="title" color={data.goalReached ? "#FFFFFF" : colors.text}>
          {weekHeadline(data)}
        </AppText>
        {summary ? (
          <AppText color={data.goalReached ? "#FFFFFFCC" : colors.textMuted}>{summary}</AppText>
        ) : (
          <AppText color={data.goalReached ? "#FFFFFFCC" : colors.textMuted}>Rien de compté cette semaine.</AppText>
        )}
        {offset === 0 ? (
          <AppText variant="caption" color={data.goalReached ? "#FFFFFFCC" : colors.textMuted}>
            {weekMessage(data, todayIndex)}
          </AppText>
        ) : null}
      </Card>
      <WeekShareButton week={data} />

      <Card style={styles.days}>
        <View style={styles.bars}>
          {data.days.map((day, i) => {
            const future = offset === 0 && i > todayIndex;
            const height = day.practiced ? Math.max(8, Math.round((day.xp / maxXp) * 72)) : 4;
            return (
              <View key={day.day} style={styles.barColumn} accessibilityLabel={`${DAY_LETTERS[i]} : ${day.practiced ? `${day.xp} XP` : day.frozen ? "jour de répit" : future ? "à venir" : "pas de pratique"}`}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: day.practiced ? (i === todayIndex && offset === 0 ? colors.accent : colors.primary) : day.frozen ? colors.primarySoft : future ? colors.surfaceMuted : colors.border,
                      },
                    ]}
                  />
                </View>
                <AppText variant="caption" color={i === todayIndex && offset === 0 ? colors.text : colors.textMuted}>
                  {DAY_LETTERS[i]}
                </AppText>
                {day.practiced ? (
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                ) : day.frozen ? (
                  <Ionicons name="snow-outline" size={14} color={colors.textFaint} />
                ) : (
                  <View style={styles.dotSpace} />
                )}
              </View>
            );
          })}
        </View>
        <View style={styles.stats}>
          <StatTile value={data.totals.activeDays} label="jours pratiqués" />
          <StatTile value={data.totals.xp} label="XP" />
          <StatTile value={data.streak} label={data.streak > 1 ? "jours de suite" : "jour de suite"} />
        </View>
      </Card>

      <SectionHeader title="Par rapport à la semaine d’avant" />
      <Card style={styles.compare}>
        {comparison.map((row) => (
          <View key={row.label} style={styles.compareRow}>
            <AppText style={styles.flex}>{row.label}</AppText>
            <AppText variant="bodyStrong">{row.current}</AppText>
            <View style={styles.trend}>
              <Ionicons
                name={row.trend === "up" ? "arrow-up" : row.trend === "down" ? "arrow-down" : "remove"}
                size={14}
                color={row.trend === "up" ? colors.success : row.trend === "down" ? colors.textMuted : colors.textFaint}
              />
              <AppText variant="caption" muted>
                {row.previous}
              </AppText>
            </View>
          </View>
        ))}
      </Card>

      <SectionHeader title="Objectif de la semaine" />
      <Card style={styles.goal}>
        <AppText muted>Combien de jours voulez-vous pratiquer chaque semaine ? Un jour compte dès que vous gagnez des XP.</AppText>
        <View style={styles.chips}>
          {WEEK_GOAL_CHOICES.map((days) => {
            const selected = data.goalActiveDays === days;
            return (
              <Pressable
                key={days}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${days} jours par semaine`}
                disabled={setGoal.isPending}
                onPress={() => setGoal.mutate(days)}
                style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface }]}>
                <AppText variant="bodyStrong" color={selected ? colors.primary : colors.text}>
                  {days}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {setGoal.isError ? (
          <AppText variant="caption" color={colors.danger}>
            Impossible d’enregistrer l’objectif pour le moment.
          </AppText>
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  nav: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  navButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headline: { gap: spacing.sm },
  days: { gap: spacing.lg },
  bars: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  barColumn: { alignItems: "center", gap: 4, width: 36 },
  barTrack: { height: 72, justifyContent: "flex-end", width: 18 },
  bar: { width: 18, borderRadius: radius.sm },
  dotSpace: { height: 14 },
  stats: { flexDirection: "row", gap: spacing.md },
  compare: { gap: spacing.md },
  compareRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 28 },
  trend: { flexDirection: "row", alignItems: "center", gap: 4, width: 56, justifyContent: "flex-end" },
  goal: { gap: spacing.md },
  chips: { flexDirection: "row", gap: spacing.sm },
  chip: { flex: 1, minHeight: 48, borderWidth: 1.5, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
});
