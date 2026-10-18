import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { IconButton } from "@/components/IconButton";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/States";
import { errorMessage } from "@/lib/api";
import { useChapters, useProgram, useProgramAction } from "@/lib/queries";
import { describeRanges, rangeKeys } from "@/lib/ranges";
import { radius, spacing, useColors } from "@/lib/theme";
import type { ProgramDay, ProgramDetail } from "@/lib/types";

export default function ProgramScreen() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = useProgram(id);
  const action = useProgramAction(id);
  const chapters = useChapters();

  if (program.isPending) return <LoadingState />;
  if (program.isError) return <ErrorState error={program.error} onRetry={() => void program.refetch()} />;
  const p = program.data;
  const progress = p.progress;
  const today = progress?.nextDay ? p.days.find((d) => d.day === progress.nextDay) : undefined;
  const done = progress?.completedDays.length ?? 0;
  const fail = (error: Error) => Alert.alert("Action impossible", errorMessage(error));

  function open(day: ProgramDay) {
    if (p.kind === "memorize") {
      router.push({ pathname: "/memorize/session", params: { keys: rangeKeys(day.ranges).join(","), programId: p.id, day: String(day.day) } });
    } else {
      const first = day.ranges[0];
      if (first) router.push({ pathname: "/surah/[id]", params: { id: String(first.chapterId), verse: String(first.fromVerse) } });
    }
  }

  return (
    <Screen>
      <Stack.Screen
        options={{
          title: "",
          headerRight: progress
            ? () => (
                <IconButton
                  icon="ellipsis-horizontal"
                  label="Options du programme"
                  onPress={() =>
                    Alert.alert(p.title, undefined, [
                      { text: "Annuler", style: "cancel" },
                      { text: "Recommencer à zéro", onPress: () => action.mutate({ type: "start" }, { onError: fail }) },
                      { text: "Abandonner", style: "destructive", onPress: () => action.mutate({ type: "quit" }, { onError: fail }) },
                    ])
                  }
                />
              )
            : undefined,
        }}
      />
      <View style={styles.header}>
        <AppText variant="label" color={colors.accent}>
          {p.kind === "memorize" ? "Mémorisation" : "Lecture"} · {p.dayCount} jours
        </AppText>
        <AppText variant="title">{p.title}</AppText>
        <AppText muted>{p.description}</AppText>
      </View>

      {!progress ? (
        <Button title="Commencer aujourd’hui" icon="play" loading={action.isPending} onPress={() => action.mutate({ type: "start" }, { onError: fail })} />
      ) : (
        <>
          <View style={styles.progress}>
            <View style={styles.progressText}>
              <AppText variant="bodyStrong">
                {done} jour{done > 1 ? "s" : ""} sur {p.dayCount}
              </AppText>
              <AppText variant="caption" muted>
                {progress.finished ? "Terminé" : behind(progress.scheduledDay, progress.nextDay)}
              </AppText>
            </View>
            <ProgressBar value={done / p.dayCount} color={colors.accent} />
          </View>
          {today ? (
            <TodayCard
              program={p}
              day={today}
              label={describeRanges(today.ranges, chapters.data)}
              completing={action.isPending}
              onOpen={() => open(today)}
              onComplete={() => action.mutate({ type: "complete", day: today.day }, { onError: fail })}
            />
          ) : (
            <FinishedCard />
          )}
        </>
      )}

      <View style={[styles.days, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {p.days.map((day, i) => {
          const completed = progress?.completedDays.includes(day.day) ?? false;
          return (
            <Pressable
              key={day.day}
              accessibilityRole="button"
              disabled={!progress}
              onPress={() => open(day)}
              style={({ pressed }) => [
                styles.day,
                i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                { opacity: pressed ? 0.6 : 1 },
              ]}>
              <Ionicons
                name={completed ? "checkmark-circle" : day.day === progress?.nextDay ? "ellipse" : "ellipse-outline"}
                size={18}
                color={completed ? colors.accent : day.day === progress?.nextDay ? colors.primary : colors.border}
              />
              <AppText variant="bodyStrong" style={styles.dayNumber}>
                {day.day}
              </AppText>
              <AppText variant="caption" muted style={styles.flex} numberOfLines={1}>
                {describeRanges(day.ranges, chapters.data)}
              </AppText>
              <AppText variant="caption" faint>
                {day.verses} v.
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );

}

function TodayCard({
  program,
  day,
  label,
  completing,
  onOpen,
  onComplete,
}: {
  program: ProgramDetail;
  day: ProgramDay;
  label: string;
  completing: boolean;
  onOpen: () => void;
  onComplete: () => void;
}) {
  return (
    <Card tone="primary" style={styles.today}>
      <AppText variant="label" color="#FFFFFF99">
        Jour {day.day} · {day.verses} versets
      </AppText>
      <AppText variant="headline" color="#FFFFFF">
        {label}
      </AppText>
      <View style={styles.todayActions}>
        <Button title={program.kind === "memorize" ? "Mémoriser" : "Lire"} variant="light" size="md" onPress={onOpen} style={styles.flex} />
        {program.kind === "read" ? (
          <Button title="Marquer comme lu" variant="onDark" size="md" loading={completing} onPress={onComplete} style={styles.flex} />
        ) : null}
      </View>
      {program.kind === "memorize" ? (
        <AppText variant="caption" color="#FFFFFFB3">
          Le jour est validé à la fin de la séance ; les versets reviennent ensuite dans vos révisions.
        </AppText>
      ) : null}
    </Card>
  );
}

function behind(scheduled: number, next: number | null): string {
  if (!next) return "Terminé";
  if (next < scheduled) return `${scheduled - next} jour${scheduled - next > 1 ? "s" : ""} de retard sur le calendrier`;
  if (next > scheduled) return "En avance sur le calendrier";
  return "Dans les temps";
}

function FinishedCard() {
  const colors = useColors();
  return (
    <Card tone="accent" style={styles.today}>
      <Ionicons name="ribbon" size={28} color={colors.accent} />
      <AppText variant="headline">Programme terminé</AppText>
      <AppText muted>Toutes les étapes sont validées. Vos révisions continuent dans l’onglet Mémoriser.</AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: spacing.sm },
  progress: { gap: spacing.sm },
  progressText: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  today: { gap: spacing.sm },
  todayActions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.xs },
  days: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  day: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  dayNumber: { width: 26 },
});
