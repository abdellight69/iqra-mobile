import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Card } from "@/components/Card";
import { ProgressRing } from "@/components/ProgressRing";
import { Screen } from "@/components/Screen";
import { ScreenHeader } from "@/components/ScreenHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { usePrograms } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";
import type { ProgramSummary } from "@/lib/types";

export default function Programs() {
  const programs = usePrograms();
  if (programs.isPending) return <LoadingState />;
  if (programs.isError) return <ErrorState error={programs.error} onRetry={() => void programs.refetch()} />;
  const started = programs.data.filter((p) => p.progress);
  // Le programme de saison (Ramadan) passe en tête des programmes à choisir.
  const others = programs.data.filter((p) => !p.progress).sort((a, b) => Number(Boolean(b.season)) - Number(Boolean(a.season)));

  return (
    <Screen onRefresh={() => void programs.refetch()} refreshing={programs.isRefetching}>
      <ScreenHeader eyebrow="Programmes" title="Pas à pas" subtitle="Un objectif découpé en étapes quotidiennes, à votre rythme." />
      {started.length > 0 ? (
        <View style={styles.group}>
          <AppText variant="label" muted>
            En cours
          </AppText>
          {started.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </View>
      ) : null}
      {others.length > 0 ? (
        <View style={styles.group}>
          <AppText variant="label" muted>
            {started.length > 0 ? "Autres programmes" : "Choisir un programme"}
          </AppText>
          {others.map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

function ProgramCard({ program }: { program: ProgramSummary }) {
  const colors = useColors();
  const done = program.progress?.completedDays.length ?? 0;
  return (
    <Card onPress={() => router.push({ pathname: "/programs/[id]", params: { id: program.id } })} style={styles.card}>
      {program.progress ? (
        <ProgressRing value={done / program.dayCount} size={56} stroke={4} color={colors.accent}>
          <AppText variant="caption" muted>
            {done}/{program.dayCount}
          </AppText>
        </ProgressRing>
      ) : (
        <View style={[styles.icon, { backgroundColor: program.kind === "memorize" ? colors.accentSoft : colors.primarySoft }]}>
          <Ionicons name={program.season === "ramadan" ? "moon" : program.kind === "memorize" ? "repeat" : "book-outline"} size={22} color={program.kind === "memorize" ? colors.accent : colors.primary} />
        </View>
      )}
      <View style={styles.flex}>
        {program.season === "ramadan" && !program.progress ? (
          <AppText variant="label" color={colors.accent}>
            Programme du Ramadan
          </AppText>
        ) : null}
        <AppText variant="headline">{program.title}</AppText>
        <AppText variant="caption" muted>
          {program.progress
            ? program.progress.finished
              ? "Programme terminé"
              : `Jour ${program.progress.nextDay} sur ${program.dayCount}`
            : program.description}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  group: { gap: spacing.md },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center" },
});
