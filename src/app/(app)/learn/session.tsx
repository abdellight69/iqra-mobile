import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { SafeArea } from "@/components/SafeArea";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { QuranExample } from "@/components/QuranExample";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { VerbTable } from "@/components/VerbTable";
import { useLearningSession, useSubmitSession } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { Exercise, SessionResult, VocabWord } from "@/lib/types";

type Answer = { wordId: string; correct: boolean };

export default function LearningSessionScreen() {
  const params = useLocalSearchParams<{ lessonId?: string; chapterId?: string; review?: string }>();
  const source = params.lessonId
    ? { lessonId: params.lessonId }
    : params.chapterId
      ? { chapterId: Number(params.chapterId) }
      : ({ review: true } as const);
  const session = useLearningSession(source);

  if (session.isPending) return <LoadingState label="Préparation de la séance…" />;
  if (session.isError) return <ErrorState error={session.error} onRetry={() => router.back()} />;
  if (session.data.exercises.length === 0) {
    return (
      <SafeArea style={{ flex: 1 }}>
        {params.chapterId ? (
          <EmptyState icon="checkmark-done" title="Rien de nouveau ici" message="Vous avez déjà appris tous les mots du livre présents dans cette sourate." action={{ title: "Fermer", onPress: () => router.back() }} />
        ) : (
          <EmptyState icon="checkmark-done" title="Rien à réviser" message="Revenez plus tard : vos mots reviendront au bon moment." action={{ title: "Fermer", onPress: () => router.back() }} />
        )}
      </SafeArea>
    );
  }
  return <SessionRunner words={session.data.words} exercises={session.data.exercises} lessonId={params.lessonId} />;
}

function SessionRunner({ words, exercises, lessonId }: { words: VocabWord[]; exercises: Exercise[]; lessonId?: string }) {
  const colors = useColors();
  const byId = useMemo(() => new Map(words.map((w) => [w.id, w])), [words]);
  const [queue, setQueue] = useState<Exercise[]>(exercises);
  const [step, setStep] = useState(0);
  const answers = useRef<Answer[]>([]);
  const retried = useRef(new Set<string>());
  const submit = useSubmitSession();
  const [result, setResult] = useState<SessionResult | null>(null);

  const exercise = queue[step];

  function record(wordId: string, correct: boolean, retry: Exercise | null) {
    // Seule la première réponse compte ; une question ratée revient une fois en fin de séance.
    if (!retried.current.has(`${wordId}:${exercise?.type}`)) answers.current.push({ wordId, correct });
    if (!correct && retry && !retried.current.has(`${wordId}:${retry.type}`)) {
      retried.current.add(`${wordId}:${retry.type}`);
      setQueue((q) => [...q, retry]);
    }
  }

  function next() {
    if (step + 1 < queue.length) return setStep(step + 1);
    submit.mutate(
      { lessonId, answers: answers.current },
      {
        onSuccess: (r) => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setResult(r);
        },
        onError: () => Alert.alert("Envoi impossible", "Vérifiez votre connexion puis réessayez.", [{ text: "Réessayer", onPress: next }]),
      },
    );
  }

  if (result) return <ResultScreen result={result} />;

  const progress = step / Math.max(queue.length, 1);

  return (
    <SafeArea style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quitter la séance"
          hitSlop={10}
          onPress={() =>
            Alert.alert("Quitter la séance ?", "Votre progression dans cette séance sera perdue.", [
              { text: "Continuer", style: "cancel" },
              { text: "Quitter", style: "destructive", onPress: () => router.back() },
            ])
          }>
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>
        <View style={styles.flex}>
          <ProgressBar value={progress} height={6} color={colors.accent} />
        </View>
      </View>

      {exercise ? (
        <ExerciseView key={step} exercise={exercise} byId={byId} onAnswer={record} onNext={next} submitting={submit.isPending} />
      ) : null}
    </SafeArea>
  );
}

type ExerciseProps = {
  exercise: Exercise;
  byId: Map<string, VocabWord>;
  onAnswer: (wordId: string, correct: boolean, retry: Exercise | null) => void;
  onNext: () => void;
  submitting: boolean;
};

function ExerciseView(props: ExerciseProps) {
  const { exercise } = props;
  if (exercise.type === "intro") return <IntroCard {...props} word={props.byId.get(exercise.wordId)} />;
  if (exercise.type === "match") return <MatchPairs {...props} exercise={exercise} />;
  return <MultipleChoice {...props} exercise={exercise} />;
}

function IntroCard({ word, onNext }: ExerciseProps & { word?: VocabWord }) {
  const colors = useColors();
  if (!word) return null;
  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.newBadge, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="sparkles" size={14} color={colors.accent} />
          <AppText variant="label" color={colors.primaryStrong}>
            Nouveau mot
          </AppText>
        </View>
        <Card style={styles.introCard}>
          <ArabicText size={48} center>
            {word.headword}
          </ArabicText>
          {word.arNote ? (
            <AppText muted center>
              {word.arNote}
            </AppText>
          ) : null}
          <AppText variant="title" center>
            {word.fr}
          </AppText>
          {word.occurrences !== null ? (
            <AppText variant="caption" muted center>
              {word.occurrences} occurrences dans le Coran (selon le livre)
            </AppText>
          ) : null}
        </Card>
        <QuranExample wordId={word.id} />
        {word.verb ? <VerbTable verb={word.verb} /> : null}
      </ScrollView>
      <Button title="Continuer" onPress={onNext} />
    </View>
  );
}

function MultipleChoice({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps & { exercise: Extract<Exercise, { choices: unknown }> }) {
  const colors = useColors();
  const [picked, setPicked] = useState<string | null>(null);
  const word = byId.get(exercise.wordId);
  const arabicPrompt = exercise.type === "ar_to_fr";
  const correct = picked === exercise.answerId;

  function pick(id: string) {
    if (picked) return;
    setPicked(id);
    const ok = id === exercise.answerId;
    void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    onAnswer(exercise.wordId, ok, ok ? null : { ...exercise, choices: [...exercise.choices].reverse() });
  }

  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="headline">{arabicPrompt ? "Que signifie ce mot ?" : "Comment dit-on en arabe ?"}</AppText>
        <Card style={styles.prompt}>
          {arabicPrompt ? (
            <ArabicText size={44} center>
              {word?.headword}
            </ArabicText>
          ) : (
            <AppText variant="title" center>
              {word?.fr}
            </AppText>
          )}
        </Card>
        <View style={styles.choices}>
          {exercise.choices.map((choice) => {
            const isAnswer = choice.id === exercise.answerId;
            const state = !picked ? "idle" : isAnswer ? "right" : choice.id === picked ? "wrong" : "idle";
            return (
              <Pressable
                key={choice.id}
                accessibilityRole="button"
                disabled={Boolean(picked)}
                onPress={() => pick(choice.id)}
                style={({ pressed }) => [
                  styles.choice,
                  {
                    backgroundColor: state === "right" ? colors.successSoft : state === "wrong" ? colors.dangerSoft : colors.surface,
                    borderColor: state === "right" ? colors.success : state === "wrong" ? colors.danger : colors.border,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}>
                {arabicPrompt ? (
                  <AppText variant="bodyStrong" center>
                    {choice.text}
                  </AppText>
                ) : (
                  <ArabicText size={28} center>
                    {choice.text}
                  </ArabicText>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {picked ? (
        <Feedback correct={correct} answer={arabicPrompt ? word?.fr : word?.headword} arabic={!arabicPrompt} onNext={onNext} loading={submitting} />
      ) : null}
    </View>
  );
}

/** Mélange déterministe (pur) : ordre fonction d'un hachage de l'identifiant et d'une graine. */
function scramble(ids: string[], seed: number): string[] {
  const hash = (id: string) => [...id].reduce((h, c) => (h * 31 + c.charCodeAt(0) + seed) % 1_000_003, seed);
  return [...ids].sort((a, b) => hash(a) - hash(b));
}

function MatchPairs({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps & { exercise: Extract<Exercise, { type: "match" }> }) {
  const colors = useColors();
  const left = useMemo(() => scramble(exercise.wordIds, 7), [exercise.wordIds]);
  const right = useMemo(() => scramble(exercise.wordIds, 13), [exercise.wordIds]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState<Set<string>>(new Set());
  const done = matched.size === exercise.wordIds.length;

  function chooseRight(id: string) {
    if (!selected || matched.has(id)) return;
    if (id === selected) {
      void Haptics.selectionAsync();
      const next = new Set(matched).add(id);
      setMatched(next);
      setSelected(null);
      if (next.size === exercise.wordIds.length) {
        for (const wordId of exercise.wordIds) onAnswer(wordId, !mistakes.has(wordId), null);
      }
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMistakes((m) => new Set(m).add(selected));
      setWrong(id);
      setTimeout(() => setWrong(null), 500);
    }
  }

  const tile = (active: boolean, isMatched: boolean, isWrong: boolean) => [
    styles.tile,
    {
      backgroundColor: isMatched ? colors.surfaceMuted : active ? colors.primarySoft : isWrong ? colors.dangerSoft : colors.surface,
      borderColor: active ? colors.primary : isWrong ? colors.danger : colors.border,
      opacity: isMatched ? 0.4 : 1,
    },
  ];

  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="headline">Associez chaque mot à son sens</AppText>
        <View style={styles.columns}>
          <View style={styles.column}>
            {left.map((id) => (
              <Pressable key={id} accessibilityRole="button" disabled={matched.has(id)} onPress={() => setSelected(id)} style={tile(selected === id, matched.has(id), false)}>
                <ArabicText size={26} center>
                  {byId.get(id)?.headword}
                </ArabicText>
              </Pressable>
            ))}
          </View>
          <View style={styles.column}>
            {right.map((id) => (
              <Pressable key={id} accessibilityRole="button" disabled={matched.has(id)} onPress={() => chooseRight(id)} style={tile(false, matched.has(id), wrong === id)}>
                <AppText variant="caption" center numberOfLines={3}>
                  {byId.get(id)?.fr}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      {done ? <Feedback correct={mistakes.size === 0} onNext={onNext} loading={submitting} /> : null}
    </View>
  );
}

function Feedback({ correct, answer, arabic, onNext, loading }: { correct: boolean; answer?: string | null; arabic?: boolean; onNext: () => void; loading: boolean }) {
  const colors = useColors();
  return (
    <View style={[styles.feedback, { backgroundColor: correct ? colors.successSoft : colors.dangerSoft }]}>
      <View style={styles.feedbackRow}>
        <Ionicons name={correct ? "checkmark-circle" : "close-circle"} size={26} color={correct ? colors.success : colors.danger} />
        <AppText variant="headline" color={correct ? colors.success : colors.danger}>
          {correct ? "Excellent !" : "Pas tout à fait"}
        </AppText>
      </View>
      {!correct && answer ? (
        arabic ? (
          <ArabicText size={28}>{answer}</ArabicText>
        ) : (
          <AppText>Bonne réponse : {answer}</AppText>
        )
      ) : null}
      <Button title="Continuer" onPress={onNext} loading={loading} />
    </View>
  );
}

function ResultScreen({ result }: { result: SessionResult }) {
  const colors = useColors();
  return (
    <SafeArea style={[styles.flex, styles.result, { backgroundColor: colors.background }]}>
      <View style={[styles.trophy, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name="ribbon-outline" size={44} color={colors.accent} />
      </View>
      <AppText variant="display" center>
        Séance terminée
      </AppText>
      <AppText muted center>
        Bâraka Allâhou fîk ! Vos mots reviendront en révision au bon moment.
      </AppText>
      <View style={styles.resultStats}>
        <Card style={styles.flex}>
          <AppText variant="label" muted>
            XP gagnés
          </AppText>
          <AppText variant="title" color={colors.accent}>
            +{result.xpGained}
          </AppText>
        </Card>
        <Card style={styles.flex}>
          <AppText variant="label" muted>
            Réussite
          </AppText>
          <AppText variant="title" color={colors.success}>
            {result.score}%
          </AppText>
        </Card>
      </View>
      <Button title="Terminer" onPress={() => router.back()} style={{ alignSelf: "stretch" }} />
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  body: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  scroll: { gap: spacing.lg, paddingBottom: spacing.lg },
  newBadge: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "center", paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  introCard: { gap: spacing.md, paddingVertical: spacing.xxxl },
  prompt: { paddingVertical: spacing.xl, alignItems: "center" },
  choices: { gap: spacing.md },
  choice: { borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.lg, minHeight: 60, justifyContent: "center" },
  columns: { flexDirection: "row", gap: spacing.md },
  column: { flex: 1, gap: spacing.md },
  tile: { borderWidth: 1.5, borderRadius: radius.lg, minHeight: 72, padding: spacing.sm, justifyContent: "center" },
  feedback: { margin: -spacing.lg, marginTop: 0, padding: spacing.xl, gap: spacing.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  feedbackRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  result: { padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  trophy: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  resultStats: { flexDirection: "row", gap: spacing.md, alignSelf: "stretch" },
});
