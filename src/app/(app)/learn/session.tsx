import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { SafeArea } from "@/components/SafeArea";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { QuranExample } from "@/components/QuranExample";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { VerbTable } from "@/components/VerbTable";
import { SessionStart, VerseContext, VerseReview } from "@/components/exercises/ChapterSession";
import { InVerseExercise } from "@/components/exercises/InVerseExercise";
import { ListenExercise } from "@/components/exercises/ListenExercise";
import { MatchPairs } from "@/components/exercises/MatchPairs";
import { MissingLetterExercise } from "@/components/exercises/MissingLetterExercise";
import { TrueFalseExercise } from "@/components/exercises/TrueFalseExercise";
import { ArabicChoice, ChoiceButton, exerciseStyles, type ExerciseProps, Feedback, ListenButton, WordSummary } from "@/components/exercises/shared";
import { planSession, type SessionExercise } from "@/lib/exercises";
import { useLearningSession, useSubmitSession } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import { annotateArabic } from "@/lib/transliterate";
import type { Exercise, LearningSession, SessionResult, VocabWord } from "@/lib/types";
import { closeScreen } from "@/lib/navigation";

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
  if (session.isError) return <ErrorState error={session.error} onRetry={() => closeScreen("/learn")} />;
  if (session.data.exercises.length === 0) {
    return (
      <SafeArea style={{ flex: 1 }}>
        {params.chapterId ? (
          <EmptyState icon="checkmark-done" title="Rien de nouveau ici" message="Vous avez déjà appris tous les mots du livre présents dans cette sourate." action={{ title: "Fermer", onPress: () => closeScreen("/learn") }} />
        ) : (
          <EmptyState icon="checkmark-done" title="Rien à réviser" message="Revenez plus tard : vos mots reviendront au bon moment." action={{ title: "Fermer", onPress: () => closeScreen("/learn") }} />
        )}
      </SafeArea>
    );
  }
  return <SessionRunner session={session.data} lessonId={params.lessonId} />;
}

function SessionRunner({ session, lessonId }: { session: LearningSession; lessonId?: string }) {
  const colors = useColors();
  const byId = useMemo(() => new Map(session.words.map((w) => [w.id, w])), [session.words]);
  // Les petits jeux sont ajoutés une fois, à l'ouverture de la séance (tirage aléatoire).
  const [queue, setQueue] = useState<SessionExercise[]>(() => planSession(session));
  const [step, setStep] = useState(0);
  const answers = useRef<Answer[]>([]);
  const retried = useRef(new Set<string>());
  const submit = useSubmitSession();
  const [result, setResult] = useState<SessionResult | null>(null);
  // Séance sur une sourate : un écran de départ annonce les mots et les versets visés.
  const [started, setStarted] = useState(!session.chapterId);

  const exercise = queue[step];

  function record(wordId: string, correct: boolean, retry: SessionExercise | null) {
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

  if (result) return session.chapterId ? <VerseReview session={session} result={result} onDone={() => closeScreen("/learn")} /> : <ResultScreen result={result} />;
  if (!started) return <SessionStart session={session} onStart={() => setStarted(true)} />;

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
              { text: "Quitter", style: "destructive", onPress: () => closeScreen("/learn") },
            ])
          }>
          <Ionicons name="close" size={28} color={colors.textMuted} />
        </Pressable>
        <View style={styles.flex}>
          <ProgressBar value={progress} height={6} color={colors.accent} />
        </View>
      </View>

      {exercise ? (
        <ExerciseView key={step} exercise={exercise} byId={byId} onAnswer={record} onNext={next} submitting={submit.isPending} verseByWord={session.verseByWord} />
      ) : null}
    </SafeArea>
  );
}

function ExerciseView(props: ExerciseProps) {
  const { exercise } = props;
  switch (exercise.type) {
    case "intro":
      return <IntroCard {...props} word={props.byId.get(exercise.wordId)} />;
    case "match":
      return <MatchPairs {...props} exercise={exercise} />;
    case "listen":
    case "listen_ar":
      return <ListenExercise {...props} exercise={exercise} />;
    case "missing_letter":
      return <MissingLetterExercise {...props} exercise={exercise} />;
    case "true_false":
      return <TrueFalseExercise {...props} exercise={exercise} />;
    case "in_verse":
      return <InVerseExercise {...props} exercise={exercise} />;
    default:
      return <MultipleChoice {...props} exercise={exercise} />;
  }
}

function IntroCard({ word, onNext, verseByWord }: ExerciseProps & { word?: VocabWord }) {
  const colors = useColors();
  if (!word) return null;
  const location = verseByWord?.[word.id];
  return (
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <View style={[styles.newBadge, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="sparkles" size={14} color={colors.accent} />
          <AppText variant="label" color={colors.primaryStrong}>
            Nouveau mot
          </AppText>
        </View>
        <Card style={styles.introCard}>
          <WordSummary word={word} size={48} />
          <ListenButton wordId={word.id} />
          {word.arNote ? (
            <AppText muted center>
              {annotateArabic(word.arNote)}
            </AppText>
          ) : null}
          {word.occurrences !== null ? (
            <AppText variant="caption" muted center>
              {word.occurrences} occurrences dans le Coran (selon le livre)
            </AppText>
          ) : null}
        </Card>
        {location ? <VerseContext location={location} /> : <QuranExample wordId={word.id} />}
        {word.verb ? <VerbTable verb={word.verb} /> : null}
      </ScrollView>
      <Button title="Continuer" onPress={onNext} />
    </View>
  );
}

function MultipleChoice({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps<Extract<Exercise, { choices: unknown }>>) {
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

  if (!word) return null;

  return (
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <AppText variant="headline">{arabicPrompt ? "Que signifie ce mot ?" : "Comment dit-on en arabe ?"}</AppText>
        <Card style={exerciseStyles.prompt}>
          {arabicPrompt ? (
            <WordSummary word={word} size={44} showMeaning={false} />
          ) : (
            <AppText variant="title" center>
              {word.fr}
            </AppText>
          )}
        </Card>
        <View style={exerciseStyles.choices}>
          {exercise.choices.map((choice) => {
            const isAnswer = choice.id === exercise.answerId;
            const state = !picked ? "idle" : isAnswer ? "right" : choice.id === picked ? "wrong" : "idle";
            return (
              <ChoiceButton key={choice.id} state={state} disabled={Boolean(picked)} onPress={() => pick(choice.id)} label={arabicPrompt ? choice.text : undefined}>
                {arabicPrompt ? (
                  <AppText variant="bodyStrong" center>
                    {choice.text}
                  </AppText>
                ) : (
                  <ArabicChoice text={choice.text} />
                )}
              </ChoiceButton>
            );
          })}
        </View>
      </ScrollView>
      {picked ? <Feedback correct={correct} word={word} onNext={onNext} loading={submitting} /> : null}
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
      <Button title="Terminer" onPress={() => closeScreen("/learn")} style={{ alignSelf: "stretch" }} />
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  newBadge: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "center", paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  introCard: { gap: spacing.md, paddingVertical: spacing.xxxl },
  result: { padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  trophy: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  resultStats: { flexDirection: "row", gap: spacing.md, alignSelf: "stretch" },
});
