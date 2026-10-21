import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { VoiceNoteField } from "@/components/VoiceNote";
import { errorMessage } from "@/lib/api";
import { localDay } from "@/lib/families-format";
import { useArchiveMissionPlan, useMissionChildren, useMissionPlan, useUpdateMissionPlan, useVerseNotes } from "@/lib/missions";
import { missionSummary, planTitle, STEPS, todayLine } from "@/lib/missions-format";
import { useChapters } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { MissionDay, MissionPlanDetail, MissionToday } from "@/lib/types";

/** L'API accepte 50 versets par demande d'explications : ceux des prochains jours d'abord. */
const NOTES_PER_REQUEST = 50;

/** Suivi d'une mission : jours faits, étoiles, mot du parent, explications, pause ou arrêt. */
export default function MissionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const plan = useMissionPlan(id);
  const children = useMissionChildren();

  if (plan.isPending) return <LoadingState />;
  if (plan.isError) return <ErrorState error={plan.error} onRetry={() => void plan.refetch()} />;
  const child = children.data?.find((c) => c.id === plan.data.childId);
  return <Detail plan={plan.data} childName={child?.displayName ?? "Votre enfant"} today={child?.plan?.id === plan.data.id ? child.plan.today : null} onRefresh={() => void plan.refetch()} refreshing={plan.isRefetching} />;
}

function Detail({
  plan,
  childName,
  today,
  onRefresh,
  refreshing,
}: {
  plan: MissionPlanDetail;
  childName: string;
  today: MissionToday | null;
  onRefresh: () => void;
  refreshing: boolean;
}) {
  const colors = useColors();
  const chapters = useChapters();
  const update = useUpdateMissionPlan(plan.id);
  const archive = useArchiveMissionPlan();
  const [message, setMessage] = useState(plan.messageText ?? "");
  const current = plan.status === "active" || plan.status === "paused";
  const upcoming = plan.days.filter((d) => d.completedOn === null).flatMap((d) => d.verses);
  const notes = useVerseNotes(upcoming.slice(0, NOTES_PER_REQUEST));
  const singleChapter = new Set(plan.ranges.map((r) => r.chapterId)).size === 1;
  const verseLabel = (key: string) => (singleChapter ? `Verset ${key.split(":")[1]}` : key);

  function stop() {
    Alert.alert("Arrêter la mission ?", `${childName} ne la verra plus sur son accueil. Les étoiles déjà gagnées sont gardées.`, [
      { text: "Annuler", style: "cancel" },
      { text: "Arrêter", style: "destructive", onPress: () => archive.mutate(plan.id, { onSuccess: () => router.back(), onError: (e) => Alert.alert("Mission non arrêtée", errorMessage(e)) }) },
    ]);
  }

  return (
    <Screen edges={[]} keyboard onRefresh={onRefresh} refreshing={refreshing}>
      <Stack.Screen options={{ title: childName }} />
      <Card style={styles.gap}>
        <AppText variant="label" muted>
          {plan.status === "paused" ? "En pause" : plan.status === "finished" ? "Terminée" : "En cours"}
          {plan.authorName ? ` · préparée par ${plan.authorName}` : ""}
        </AppText>
        <AppText variant="title">{planTitle(plan, chapters.data)}</AppText>
        <ProgressBar value={plan.totalDays ? plan.completedDays / plan.totalDays : 0} />
        <AppText variant="caption" muted>
          {plan.completedDays} jour{plan.completedDays > 1 ? "s" : ""} sur {plan.totalDays} · {missionSummary(plan.totalVerses, plan.versesPerDay, plan.weekdays)}
        </AppText>
        {today ? <AppText variant="bodyStrong">{todayLine(today, plan.totalDays, localDay())}</AppText> : null}
        <View style={styles.steps}>
          {STEPS.filter((s) => plan.steps.includes(s.kind)).map((s) => (
            <View key={s.kind} style={[styles.stepChip, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name={s.icon} size={14} color={colors.primary} />
              <AppText variant="caption" color={colors.primary}>
                {s.title}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      {current ? (
        <>
          <SectionHeader title={`Votre mot pour ${childName}`} />
          <Card style={styles.gap}>
            <VoiceNoteField
              value={plan.messageAudioId ? { id: plan.messageAudioId, durationMs: 0 } : null}
              onChange={(note) => update.mutate({ messageAudioId: note?.id ?? null }, { onError: (e) => Alert.alert("Message non enregistré", errorMessage(e)) })}
            />
            <TextField label="Message écrit" value={message} onChangeText={(v) => setMessage(v.slice(0, 500))} multiline />
            {message.trim() !== (plan.messageText ?? "") ? (
              <Button
                title="Enregistrer le message"
                size="md"
                loading={update.isPending}
                onPress={() => update.mutate({ messageText: message.trim() || null }, { onError: (e) => Alert.alert("Message non enregistré", errorMessage(e)) })}
              />
            ) : null}
            <AppText variant="caption" faint>
              {childName} le voit sur sa mission du jour, chaque jour, jusqu’à ce que vous le changiez.
            </AppText>
          </Card>
        </>
      ) : null}

      <SectionHeader title="Jour par jour" />
      <AppText variant="caption" muted>
        Touchez un verset pour l’expliquer avec vos mots, par écrit ou à voix haute.
      </AppText>
      <Card padded={false}>
        {plan.days.map((day, i) => (
          <DayRow
            key={day.dayIndex}
            day={day}
            totalSteps={plan.steps.length}
            first={i === 0}
            verseLabel={verseLabel}
            explained={(key) => Boolean(notes.data?.[key])}
          />
        ))}
      </Card>

      {current ? (
        <View style={styles.gap}>
          <Button
            title={plan.status === "paused" ? "Reprendre la mission" : "Mettre en pause"}
            icon={plan.status === "paused" ? "play" : "pause"}
            variant="secondary"
            loading={update.isPending}
            onPress={() => update.mutate({ status: plan.status === "paused" ? "active" : "paused" })}
          />
          <Button title="Arrêter la mission" variant="danger" loading={archive.isPending} onPress={stop} />
        </View>
      ) : (
        <Button title="Préparer une nouvelle mission" icon="add" onPress={() => router.replace({ pathname: "/missions/new", params: { childId: plan.childId } })} />
      )}
    </Screen>
  );
}

function DayRow({
  day,
  totalSteps,
  first,
  verseLabel,
  explained,
}: {
  day: MissionDay;
  totalSteps: number;
  first: boolean;
  verseLabel: (key: string) => string;
  explained: (key: string) => boolean;
}) {
  const colors = useColors();
  const done = day.completedOn !== null;
  return (
    <View style={[styles.day, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
      <View style={styles.dayHeader}>
        <Ionicons name={done ? "checkmark-circle" : "ellipse-outline"} size={20} color={done ? colors.success : colors.textFaint} />
        <AppText variant="bodyStrong" style={styles.flex}>
          Jour {day.dayIndex}
        </AppText>
        <View style={styles.stars} accessibilityLabel={`${day.stars} étoile${day.stars > 1 ? "s" : ""} sur ${totalSteps}`}>
          {Array.from({ length: totalSteps }, (_, i) => (
            <Ionicons key={i} name={i < day.stars ? "star" : "star-outline"} size={14} color={i < day.stars ? colors.accent : colors.textFaint} />
          ))}
        </View>
      </View>
      <View style={styles.verses}>
        {day.verses.map((key) => (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityLabel={`${verseLabel(key)} : ${explained(key) ? "modifier l’explication" : "l’expliquer"}`}
            onPress={() => router.push({ pathname: "/missions/note", params: { verseKey: key } })}
            style={({ pressed }) => [styles.verse, { backgroundColor: explained(key) ? colors.accentSoft : colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}>
            <AppText variant="caption">{verseLabel(key)}</AppText>
            <Ionicons name={explained(key) ? "chatbubble-ellipses" : "add"} size={14} color={explained(key) ? colors.accent : colors.textMuted} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  steps: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  stepChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: radius.pill },
  day: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  dayHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stars: { flexDirection: "row", gap: 2 },
  verses: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs, paddingLeft: 28 },
  verse: { flexDirection: "row", alignItems: "center", gap: 4, minHeight: 36, paddingHorizontal: spacing.md, borderRadius: radius.pill },
});
