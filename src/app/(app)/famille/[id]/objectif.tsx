import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Chip } from "@/components/FamilyGoalCard";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { errorMessage } from "@/lib/api";
import { useCreateGoal, useFamily } from "@/lib/families";
import { goalTitle, METRIC_ORDER, METRICS, PERIODS, SCOPES } from "@/lib/families-format";
import { radius, spacing, useColors } from "@/lib/theme";
import type { GoalMetric, GoalPeriod, GoalScope } from "@/lib/types";

/** Quantités proposées par défaut pour une semaine (×4 pour un mois). */
const DEFAULT_TARGET: Record<GoalMetric, number> = { verses_read: 70, words_learned: 20, verses_learned: 5, reviews: 50, active_days: 5, xp: 150 };

/** Proposer un objectif : mesure, quantité, période, pour qui ; aperçu en clair avant validation. */
export default function NewGoal() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const family = useFamily(id);
  const create = useCreateGoal(id);
  const [metric, setMetric] = useState<GoalMetric>("verses_read");
  const [period, setPeriod] = useState<GoalPeriod>("week");
  const [scope, setScope] = useState<GoalScope>("each");
  const [target, setTarget] = useState(String(DEFAULT_TARGET.verses_read));
  const [assignees, setAssignees] = useState<string[]>([]);
  const [title, setTitle] = useState("");

  if (family.isPending) return <LoadingState />;
  if (family.isError) return <ErrorState error={family.error} onRetry={() => void family.refetch()} />;
  const members = family.data.members;
  const n = Number.parseInt(target, 10);
  const validTarget = Number.isInteger(n) && n >= 1 && n <= 10_000;
  const valid = validTarget && (scope !== "assigned" || assignees.length > 0);
  const names = members.filter((m) => assignees.includes(m.userId)).map((m) => m.displayName);
  const preview = goalTitle({ title: title.trim() || null, metric, target: validTarget ? n : 0, period, scope }, names);

  const pickMetric = (m: GoalMetric) => {
    setMetric(m);
    setTarget(String(DEFAULT_TARGET[m] * (period === "month" ? 4 : 1)));
  };
  const pickPeriod = (p: GoalPeriod) => {
    setPeriod(p);
    setTarget(String(DEFAULT_TARGET[metric] * (p === "month" ? 4 : 1)));
  };

  return (
    <Screen edges={[]} keyboard>
      <SectionHeader title="Que mesurer ?" />
      <View style={styles.metrics}>
        {METRIC_ORDER.map((m) => {
          const selected = m === metric;
          return (
            <Pressable
              key={m}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => pickMetric(m)}
              style={({ pressed }) => [
                styles.metric,
                { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface, opacity: pressed ? 0.7 : 1 },
              ]}>
              <Ionicons name={METRICS[m].icon} size={20} color={selected ? colors.primary : colors.textMuted} />
              <AppText variant="bodyStrong" color={selected ? colors.primary : colors.text}>
                {METRICS[m].label}
              </AppText>
              <AppText variant="caption" muted>
                {METRICS[m].description}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <SectionHeader title="Combien, et sur quelle période ?" />
      <View style={styles.chips}>
        {(Object.keys(PERIODS) as GoalPeriod[]).map((p) => (
          <Chip key={p} label={PERIODS[p].label} selected={period === p} onPress={() => pickPeriod(p)} />
        ))}
      </View>
      <TextField
        label={`Quantité ${PERIODS[period].every}`}
        value={target}
        onChangeText={(t) => setTarget(t.replace(/[^0-9]/g, ""))}
        keyboardType="number-pad"
        maxLength={5}
        error={target && !validTarget ? "Entre 1 et 10 000" : null}
      />

      <SectionHeader title="Pour qui ?" />
      <View style={styles.chips}>
        {(Object.keys(SCOPES) as GoalScope[]).map((s) => (
          <Chip key={s} label={SCOPES[s].label} selected={scope === s} onPress={() => setScope(s)} />
        ))}
      </View>
      <AppText variant="caption" muted>
        {SCOPES[scope].description}
      </AppText>
      {scope === "assigned" ? (
        <View style={styles.chips}>
          {members.map((m) => (
            <Chip
              key={m.userId}
              label={m.isMe ? `${m.displayName} (moi)` : m.displayName}
              selected={assignees.includes(m.userId)}
              onPress={() => setAssignees((a) => (a.includes(m.userId) ? a.filter((x) => x !== m.userId) : [...a, m.userId]))}
            />
          ))}
        </View>
      ) : null}

      <TextField label="Titre (facultatif)" value={title} onChangeText={setTitle} placeholder={goalTitle({ title: null, metric, target: validTarget ? n : 0, period, scope }, names)} maxLength={80} />

      <Card tone="flat" style={styles.preview}>
        <AppText variant="label" muted>
          Aperçu
        </AppText>
        <AppText variant="bodyStrong">{preview}</AppText>
        <AppText variant="caption" muted>
          Vous vous engagez d’office si vous êtes concerné (avec les profils de votre compte) ; les autres personnes concernées l’accepteront ou le refuseront.
        </AppText>
      </Card>
      {create.isError ? <AppText color={colors.danger}>{errorMessage(create.error)}</AppText> : null}
      <Button
        title="Proposer l’objectif"
        disabled={!valid}
        loading={create.isPending}
        onPress={() =>
          create.mutate(
            { metric, target: n, period, scope, assignees: scope === "assigned" ? assignees : undefined, title: title.trim() || null },
            { onSuccess: () => router.back() },
          )
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metric: { width: "48%", flexGrow: 1, borderWidth: 1.5, borderRadius: radius.md, padding: spacing.md, gap: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  preview: { gap: spacing.xs },
});
