import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useTrackQueue } from "@/lib/audio";
import { verseTransliteration } from "@/lib/quran-text";
import { useChapterAudio, useDueVerses, useMe, usePlan, useReviewVerse, useVerse } from "@/lib/queries";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { Word } from "@/lib/types";

const MAX_NEW_VERSES = 5;
type HideLevel = 0 | 1 | 2;
const HIDE_LABELS: Record<HideLevel, string> = { 0: "Texte", 1: "Indices", 2: "Masqué" };
const GRADES = [
  { quality: 1, label: "À revoir", icon: "refresh" as const },
  { quality: 3, label: "Difficile", icon: "alert-circle-outline" as const },
  { quality: 4, label: "Bien", icon: "checkmark" as const },
  { quality: 5, label: "Parfait", icon: "star" as const },
];

/** Première lettre d'un mot, avec ses signes, pour l'indice de récitation. */
function firstLetter(text: string): string {
  const chars = [...text];
  const start = chars.findIndex((c) => /[ء-يٱ]/.test(c));
  if (start < 0) return text;
  let end = start + 1;
  while (end < chars.length && /[ً-ٰٟۖ-ۭ]/.test(chars[end]!)) end++;
  return `${chars.slice(0, end).join("")}…`;
}

export default function MemorizationSession() {
  const params = useLocalSearchParams<{ planId?: string; verse?: string; due?: string }>();
  const plan = usePlan(params.planId ?? "");
  const due = useDueVerses();

  const keys = useMemo<string[] | null>(() => {
    if (params.due) return due.data ? due.data.map((v) => v.key) : null;
    if (!plan.data) return null;
    if (params.verse) return [`${plan.data.chapterId}:${params.verse}`];
    const dueKeys = plan.data.verses.filter((v) => v.due).map((v) => v.key);
    const fresh = plan.data.verses.filter((v) => v.status === "new").slice(0, MAX_NEW_VERSES).map((v) => v.key);
    const selection = [...dueKeys, ...fresh];
    return selection.length > 0 ? selection : plan.data.verses.map((v) => v.key);
    // La sélection est figée au démarrage de la séance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.due ? due.isSuccess : plan.isSuccess]);

  const source = params.due ? due : plan;
  if (source.isError) return <ErrorState error={source.error} onRetry={() => router.back()} />;
  if (!keys) return <LoadingState label="Préparation de la séance…" />;
  if (keys.length === 0) {
    return (
      <SafeAreaView style={{ flex: 1 }}>
        <EmptyState icon="checkmark-done" title="Tout est à jour" message="Aucun verset à réviser pour le moment." action={{ title: "Fermer", onPress: () => router.back() }} />
      </SafeAreaView>
    );
  }
  return <SessionRunner keys={keys} />;
}

function SessionRunner({ keys }: { keys: string[] }) {
  const colors = useColors();
  const [index, setIndex] = useState(0);
  const [xp, setXp] = useState(0);
  const [finished, setFinished] = useState(false);

  if (finished) {
    return (
      <SafeAreaView style={[styles.flex, styles.done, { backgroundColor: colors.background }]}>
        <View style={[styles.trophy, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="ribbon" size={56} color={colors.accent} />
        </View>
        <AppText variant="display" center>
          Séance terminée
        </AppText>
        <AppText muted center>
          {keys.length} verset{keys.length > 1 ? "s" : ""} travaillé{keys.length > 1 ? "s" : ""} · +{xp} XP
        </AppText>
        <AppText muted center>
          Les prochaines révisions sont planifiées selon votre auto-évaluation.
        </AppText>
        <Button title="Terminer" onPress={() => router.back()} style={{ alignSelf: "stretch" }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quitter"
          hitSlop={10}
          onPress={() =>
            Alert.alert("Quitter la séance ?", "Les versets déjà évalués restent enregistrés.", [
              { text: "Continuer", style: "cancel" },
              { text: "Quitter", style: "destructive", onPress: () => router.back() },
            ])
          }>
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>
        <View style={styles.flex}>
          <ProgressBar value={index / keys.length} height={6} color={colors.accent} />
        </View>
        <AppText variant="caption" muted>
          {index + 1}/{keys.length}
        </AppText>
      </View>
      <VerseDrill
        key={keys[index]}
        verseKey={keys[index]!}
        onDone={(gained) => {
          setXp((x) => x + gained);
          if (index + 1 < keys.length) setIndex(index + 1);
          else setFinished(true);
        }}
      />
    </SafeAreaView>
  );
}

function VerseDrill({ verseKey, onDone }: { verseKey: string; onDone: (xp: number) => void }) {
  const colors = useColors();
  const me = useMe();
  const [chapterId, verseNumber] = verseKey.split(":").map(Number) as [number, number];
  const verse = useVerse(verseKey, me.data?.translationId ?? null);
  const audio = useChapterAudio(chapterId, me.data?.recitationId ?? null);
  const review = useReviewVerse();
  const [repeat, setRepeat] = useState(3);
  const [hide, setHide] = useState<HideLevel>(0);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [stage, setStage] = useState<"study" | "recite" | "grade">("study");
  const [showTranslation, setShowTranslation] = useState(false);
  const [showTransliteration, setShowTransliteration] = useState(true);

  const url = audio.data?.files.find((f) => f.verseKey === verseKey)?.url;
  const tracks = useMemo(() => (url ? [{ key: verseKey, url }] : []), [url, verseKey]);
  const player = useTrackQueue(tracks, { repeat, autoAdvance: false });

  if (verse.isPending) return <LoadingState />;
  if (verse.isError) return <ErrorState error={verse.error} onRetry={() => void verse.refetch()} />;
  const words = verse.data.words.filter((w) => w.type === "word");
  const effectiveHide: HideLevel = stage === "recite" ? 2 : stage === "grade" ? 0 : hide;
  // La phonétique accompagne le texte visible ; elle disparaît dès qu'on masque pour réciter.
  const transliteration = showTransliteration && effectiveHide === 0 ? verseTransliteration(verse.data) : null;

  function renderWord(word: Word) {
    const visible = effectiveHide === 0 || revealed.has(word.location);
    const text = visible ? word.textUthmani : effectiveHide === 1 ? firstLetter(word.textUthmani) : "";
    return (
      <Pressable
        key={word.location}
        accessibilityRole="button"
        accessibilityLabel={visible ? word.textUthmani : "Mot masqué, toucher pour révéler"}
        onPress={() => setRevealed((r) => new Set(r).add(word.location))}
        style={[styles.word, !visible && { backgroundColor: colors.surfaceMuted, minWidth: effectiveHide === 2 ? 56 : undefined }]}>
        <AppText style={{ fontFamily: fonts.arabic, fontSize: 30, lineHeight: 56, color: visible ? colors.arabic : colors.textMuted }}>
          {text || " "}
        </AppText>
      </Pressable>
    );
  }

  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="label" muted>
          Sourate {chapterId} · verset {verseNumber}
        </AppText>
        <Card style={styles.verseCard}>
          <View style={styles.words}>{words.map(renderWord)}</View>
          {transliteration ? (
            <AppText italic color={colors.accent} style={styles.transliteration}>
              {transliteration}
            </AppText>
          ) : null}
          {showTranslation && verse.data.translation ? (
            <AppText muted style={[styles.translation, { borderTopColor: colors.border }]}>
              {verse.data.translation.text}
            </AppText>
          ) : null}
        </Card>

        {stage === "study" ? (
          <>
            <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
              {([0, 1, 2] as HideLevel[]).map((level) => (
                <Pressable
                  key={level}
                  accessibilityRole="button"
                  accessibilityState={{ selected: hide === level }}
                  onPress={() => {
                    setHide(level);
                    setRevealed(new Set());
                  }}
                  style={[styles.segment, hide === level && { backgroundColor: colors.surface }]}>
                  <AppText variant="bodyStrong" color={hide === level ? colors.primary : colors.textMuted}>
                    {HIDE_LABELS[level]}
                  </AppText>
                </Pressable>
              ))}
            </View>

            <Card style={styles.audioCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={player.playing ? "Pause" : "Écouter le verset"}
                disabled={!url}
                onPress={() => (player.index === null ? player.playAt(0) : player.toggle())}
                style={[styles.play, { backgroundColor: url ? colors.primary : colors.border }]}>
                {audio.isPending ? (
                  <ActivityIndicator color={colors.onPrimary} />
                ) : (
                  <Ionicons name={player.playing ? "pause" : "play"} size={24} color={colors.onPrimary} />
                )}
              </Pressable>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">Écouter et répéter</AppText>
                <AppText variant="caption" muted>
                  {player.index !== null ? `Écoute ${player.plays}/${repeat}` : "Récitation verset par verset"}
                </AppText>
              </View>
              {[1, 3, 5].map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`Répéter ${n} fois`}
                  onPress={() => setRepeat(n)}
                  style={[styles.repeat, { borderColor: repeat === n ? colors.primary : colors.border, backgroundColor: repeat === n ? colors.primarySoft : "transparent" }]}>
                  <AppText variant="caption" color={repeat === n ? colors.primary : colors.textMuted}>
                    ×{n}
                  </AppText>
                </Pressable>
              ))}
            </Card>

            <View style={styles.links}>
              <Pressable accessibilityRole="button" onPress={() => setShowTransliteration((s) => !s)} style={styles.link}>
                <AppText variant="bodyStrong" color={colors.primary}>
                  {showTransliteration ? "Masquer la phonétique" : "Afficher la phonétique"}
                </AppText>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => setShowTranslation((s) => !s)} style={styles.link}>
                <AppText variant="bodyStrong" color={colors.primary}>
                  {showTranslation ? "Masquer la traduction" : "Afficher la traduction"}
                </AppText>
              </Pressable>
            </View>
          </>
        ) : null}

        {stage === "recite" ? (
          <Card tone="accent">
            <AppText variant="bodyStrong">Récitez le verset de mémoire</AppText>
            <AppText muted>À voix basse ou à voix haute. Touchez un mot pour le révéler si vous bloquez.</AppText>
          </Card>
        ) : null}
      </ScrollView>

      {stage === "study" ? (
        <Button
          title="Je suis prêt à réciter"
          icon="mic-outline"
          onPress={() => {
            player.stop();
            setRevealed(new Set());
            setStage("recite");
          }}
        />
      ) : stage === "recite" ? (
        <Button title="Vérifier" icon="eye-outline" onPress={() => setStage("grade")} />
      ) : (
        <View style={styles.grades}>
          <AppText variant="headline" center>
            Comment s’est passée la récitation ?
          </AppText>
          <View style={styles.gradeRow}>
            {GRADES.map((g) => (
              <Pressable
                key={g.quality}
                accessibilityRole="button"
                disabled={review.isPending}
                onPress={() =>
                  review.mutate(
                    { chapterId, verseNumber, quality: g.quality },
                    {
                      onSuccess: (r) => {
                        void Haptics.notificationAsync(
                          g.quality >= 3 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
                        );
                        onDone(r.xpGained);
                      },
                      onError: () => Alert.alert("Enregistrement impossible", "Vérifiez votre connexion puis réessayez."),
                    },
                  )
                }
                style={({ pressed }) => [
                  styles.grade,
                  { borderColor: colors.border, backgroundColor: colors.surface, transform: [{ scale: pressed ? 0.96 : 1 }] },
                ]}>
                <Ionicons name={g.icon} size={22} color={g.quality < 3 ? colors.danger : g.quality === 5 ? colors.accent : colors.primary} />
                <AppText variant="caption">{g.label}</AppText>
              </Pressable>
            ))}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  body: { flex: 1, padding: spacing.lg, gap: spacing.md },
  scroll: { gap: spacing.lg, paddingBottom: spacing.lg },
  verseCard: { gap: spacing.md },
  words: { flexDirection: "row-reverse", flexWrap: "wrap", columnGap: spacing.sm, rowGap: spacing.xs },
  word: { borderRadius: radius.sm, paddingHorizontal: 4, alignItems: "center" },
  translation: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md },
  segmented: { flexDirection: "row", borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, alignItems: "center", paddingVertical: spacing.sm, borderRadius: radius.pill },
  audioCard: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  play: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  repeat: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  transliteration: { fontSize: 15, lineHeight: 23 },
  links: { flexDirection: "row", justifyContent: "center", flexWrap: "wrap", columnGap: spacing.lg },
  link: { alignSelf: "center", padding: spacing.xs },
  grades: { gap: spacing.md },
  gradeRow: { flexDirection: "row", gap: spacing.sm },
  grade: { flex: 1, alignItems: "center", gap: 6, paddingVertical: spacing.lg, borderRadius: radius.lg, borderWidth: 1 },
  done: { padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  trophy: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
});
