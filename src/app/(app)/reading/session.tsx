import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button, type ButtonProps } from "@/components/Button";
import { BigButton, RoundButton } from "@/components/kids/KidButton";
import { Card } from "@/components/Card";
import { HighlightedArabic } from "@/components/HighlightedArabic";
import { LetterCard } from "@/components/LetterCard";
import { ProgressBar } from "@/components/ProgressBar";
import { SafeArea } from "@/components/SafeArea";
import { TracePad } from "@/components/TracePad";
import { ErrorState, LoadingState } from "@/components/States";
import { useOneShot } from "@/lib/audio";
import { KIDS, useKidsColors, useKidsMode } from "@/lib/kids";
import { useAlphabet, useCompleteReadingLesson, useReadingSession } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { AlphabetLetter, ReadingResult, ReadingStep, ReadingWord } from "@/lib/types";
import { closeScreen } from "@/lib/navigation";

type ChoiceStep = Extract<ReadingStep, { type: "choice" }>;

/** Bouton de passage à la suite : grand bouton jaune pour un enfant, bouton courant sinon. */
function NextButton(props: ButtonProps) {
  const kids = useKidsMode();
  if (!kids) return <Button {...props} />;
  return <BigButton title={props.title} icon={props.icon ?? "arrow-forward"} tone={props.variant === "ghost" ? "white" : "sun"} disabled={props.disabled || props.loading} onPress={props.onPress ?? (() => undefined)} />;
}

export default function ReadingSessionScreen() {
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const session = useReadingSession(lessonId);
  const overview = useAlphabet();

  if (session.isPending || overview.isPending) return <LoadingState label="Préparation de la leçon…" />;
  if (session.isError) return <ErrorState error={session.error} onRetry={() => void session.refetch()} />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;

  const lessons = overview.data.units.flatMap((u) => u.lessons);
  const nextLesson = lessons[lessons.findIndex((l) => l.id === lessonId) + 1] ?? null;
  return (
    <Runner
      key={lessonId}
      lessonId={lessonId}
      title={session.data.lesson.title}
      steps={session.data.steps}
      letters={new Map(overview.data.letters.map((l) => [l.id, l]))}
      nextLesson={nextLesson}
    />
  );
}

function Runner({
  lessonId,
  title,
  steps,
  letters,
  nextLesson,
}: {
  lessonId: string;
  title: string;
  steps: ReadingStep[];
  letters: Map<string, AlphabetLetter>;
  nextLesson: { id: string; title: string } | null;
}) {
  const colors = useColors();
  const kids = useKidsMode();
  const [queue, setQueue] = useState(steps);
  const [index, setIndex] = useState(0);
  const score = useRef({ correct: 0, total: 0 });
  const retried = useRef(new Set<ReadingStep>());
  const complete = useCompleteReadingLesson(lessonId);
  const [result, setResult] = useState<ReadingResult | null>(null);
  const step = queue[index];

  /** Seule la première réponse compte ; une question ratée revient une fois en fin de leçon. */
  function answered(current: ReadingStep, correct: boolean) {
    if (!retried.current.has(current)) {
      score.current.total += 1;
      if (correct) score.current.correct += 1;
    }
    if (!correct && current.type === "choice" && !retried.current.has(current)) {
      const again = { ...current, choices: [...current.choices].reverse() };
      retried.current.add(again);
      setQueue((q) => [...q, again]);
    }
  }

  function next() {
    if (index + 1 < queue.length) return setIndex(index + 1);
    complete.mutate(score.current, {
      onSuccess: (r) => {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setResult(r);
      },
      onError: () => Alert.alert("Envoi impossible", "Vérifiez votre connexion puis réessayez.", [{ text: "Réessayer", onPress: next }]),
    });
  }

  if (result) return <Result title={title} result={result} nextLesson={nextLesson} />;

  return (
    <SafeArea style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.topBar}>
        {kids ? (
          <RoundButton
            icon="close"
            label="Arrêter la leçon"
            onPress={() =>
              Alert.alert("Arrêter la leçon ?", "Ce que tu as fait dans cette leçon sera perdu.", [
                { text: "Continuer", style: "cancel" },
                { text: "Arrêter", style: "destructive", onPress: () => closeScreen("/reading") },
              ])
            }
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quitter la leçon"
            hitSlop={10}
            onPress={() =>
              Alert.alert("Quitter la leçon ?", "Votre progression dans cette leçon sera perdue.", [
                { text: "Continuer", style: "cancel" },
                { text: "Quitter", style: "destructive", onPress: () => closeScreen("/reading") },
              ])
            }>
            <Ionicons name="close" size={28} color={colors.textMuted} />
          </Pressable>
        )}
        <View style={styles.flex}>
          <ProgressBar value={index / Math.max(queue.length, 1)} height={kids ? 12 : 6} color={kids ? KIDS.sun : colors.accent} />
        </View>
      </View>
      {step ? (
        <StepView key={index} step={step} letters={letters} onAnswer={(ok) => answered(step, ok)} onNext={next} busy={complete.isPending} />
      ) : null}
    </SafeArea>
  );
}

type StepProps = { letters: Map<string, AlphabetLetter>; onAnswer: (correct: boolean) => void; onNext: () => void; busy: boolean };

function StepView({ step, ...props }: StepProps & { step: ReadingStep }) {
  switch (step.type) {
    case "letter":
      return <LetterStep step={step} {...props} />;
    case "concept":
      return <ConceptStep step={step} {...props} />;
    case "choice":
      return <ChoiceView step={step} {...props} />;
    case "match":
      return <MatchView step={step} {...props} />;
    case "reading":
      return <GuidedReading step={step} {...props} />;
    case "trace":
      return <TraceStep step={step} {...props} />;
    case "spell":
      return <SpellStep step={step} {...props} />;
  }
}

function LetterStep({ step, letters, onNext }: StepProps & { step: Extract<ReadingStep, { type: "letter" }> }) {
  const colors = useColors();
  const letter = letters.get(step.letterId);
  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="sparkles" size={14} color={colors.accent} />
          <AppText variant="label" color={colors.primaryStrong}>
            Nouvelle lettre
          </AppText>
        </View>
        {letter ? <LetterCard letter={letter} example={step.example} /> : null}
      </ScrollView>
      <NextButton title="Continuer" onPress={onNext} />
    </View>
  );
}

function ConceptStep({ step, onNext }: StepProps & { step: Extract<ReadingStep, { type: "concept" }> }) {
  const colors = useColors();
  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="display">{step.title}</AppText>
        {step.paragraphs.map((p, i) => (
          <AppText key={i} style={styles.paragraph}>
            {p}
          </AppText>
        ))}
        <View style={styles.examples}>
          {step.examples.map((e, i) => (
            <Card key={i} style={styles.exampleCard}>
              <ArabicText size={40} center>
                {e.arabic}
              </ArabicText>
              <AppText variant="bodyStrong" center color={colors.accent} italic>
                {e.reading}
              </AppText>
              {e.note ? (
                <AppText variant="caption" muted center>
                  {e.note}
                </AppText>
              ) : null}
            </Card>
          ))}
        </View>
      </ScrollView>
      <NextButton title="J’ai compris" onPress={onNext} />
    </View>
  );
}

function PlayButton({ url, label, size = 56, autoPlay = false }: { url: string | null; label: string; size?: number; autoPlay?: boolean }) {
  const colors = useColors();
  const audio = useOneShot();
  const played = useRef(false);
  useEffect(() => {
    if (autoPlay && url && !played.current) {
      played.current = true;
      audio.play(url);
    }
  }, [autoPlay, url, audio]);
  if (!url) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => audio.play(url)}
      style={({ pressed }) => [
        styles.play,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.primary, transform: [{ scale: pressed ? 0.94 : 1 }] },
      ]}>
      <Ionicons name={audio.playing ? "volume-high" : "play"} size={size * 0.42} color={colors.onPrimary} />
    </Pressable>
  );
}

function ChoiceView({ step, onAnswer, onNext, busy }: StepProps & { step: ChoiceStep }) {
  const colors = useColors();
  const kids = useKidsMode();
  const kc = useKidsColors();
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === step.answerId;
  const { prompt } = step;
  const arabicChoices = step.choices.every((c) => c.arabic);
  const answer = step.choices.find((c) => c.id === step.answerId);
  const shortArabic = prompt.arabic && [...prompt.arabic].length <= 4;

  function pick(id: string) {
    if (picked) return;
    setPicked(id);
    const ok = id === step.answerId;
    void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    onAnswer(ok);
  }

  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="headline">{step.question}</AppText>
        <Card style={styles.prompt}>
          {prompt.listen && prompt.word ? (
            <>
              <PlayButton url={prompt.word.audioUrl} label="Réécouter le mot" size={72} autoPlay />
              {prompt.word.audioUrl ? null : (
                <AppText muted center>
                  Audio indisponible : lisez le mot ci-dessous.
                </AppText>
              )}
              {picked || !prompt.word.audioUrl ? <ArabicText size={40} center>{prompt.word.text}</ArabicText> : null}
            </>
          ) : prompt.word ? (
            <HighlightedArabic text={prompt.word.text} highlight={prompt.highlight} marks={prompt.marks} size={52} center />
          ) : prompt.arabic ? (
            <HighlightedArabic text={prompt.arabic} highlight={prompt.highlight} size={shortArabic ? 84 : 52} center style={shortArabic ? styles.promptGlyph : undefined} />
          ) : null}
          {prompt.text ? (
            <AppText variant={prompt.arabic ? "bodyStrong" : "title"} center muted={Boolean(prompt.arabic)}>
              {prompt.text}
            </AppText>
          ) : null}
          {prompt.detail ? (
            <AppText muted center>
              {prompt.detail}
            </AppText>
          ) : null}
        </Card>

        <View style={arabicChoices ? styles.grid : styles.list}>
          {step.choices.map((choice) => {
            const isAnswer = choice.id === step.answerId;
            const state = !picked ? "idle" : isAnswer ? "right" : choice.id === picked ? "wrong" : "idle";
            return (
              <Pressable
                key={choice.id}
                accessibilityRole="button"
                accessibilityLabel={choice.text ?? choice.arabic}
                disabled={Boolean(picked)}
                onPress={() => pick(choice.id)}
                style={({ pressed }) => [
                  arabicChoices ? styles.tile : styles.choice,
                  {
                    backgroundColor: state === "right" ? colors.successSoft : state === "wrong" ? colors.dangerSoft : colors.surface,
                    borderColor: state === "right" ? colors.success : state === "wrong" ? colors.danger : colors.border,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                  // Enfant : pastille épaisse posée sur son bord, comme les autres boutons.
                  kids && { borderWidth: 0, borderRadius: 22, borderBottomWidth: pressed ? 1 : 4, borderBottomColor: state === "right" ? colors.success : state === "wrong" ? colors.danger : kc.edge, marginTop: pressed ? 3 : 0 },
                ]}>
                {choice.arabic ? (
                  <ArabicText size={[...choice.arabic].length <= 3 ? 44 : 32} center style={[...choice.arabic].length <= 3 ? styles.choiceGlyph : undefined}>
                    {choice.arabic}
                  </ArabicText>
                ) : (
                  <AppText variant="bodyStrong" center>
                    {choice.text}
                  </AppText>
                )}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {picked ? (
        <View style={[styles.feedback, { backgroundColor: correct ? colors.successSoft : colors.dangerSoft }]}>
          <View style={styles.feedbackRow}>
            <Ionicons name={correct ? "checkmark-circle" : "close-circle"} size={26} color={correct ? colors.success : colors.danger} />
            <AppText variant="headline" color={correct ? colors.success : colors.danger}>
              {correct ? "Excellent !" : "Pas tout à fait"}
            </AppText>
          </View>
          {!correct && answer && !step.reveal ? (
            answer.arabic ? (
              <View style={styles.answerRow}>
                <AppText>Bonne réponse :</AppText>
                <ArabicText size={34} style={styles.glyphLine}>
                  {answer.arabic}
                </ArabicText>
              </View>
            ) : (
              <AppText>Bonne réponse : {answer.text}</AppText>
            )
          ) : null}
          {step.reveal ? (
            <View style={styles.reveal}>
              <PlayButton url={step.reveal.audioUrl} label="Écouter le mot" size={44} autoPlay />
              <View style={styles.flex}>
                <ArabicText size={30}>{step.reveal.text}</ArabicText>
                <AppText italic color={colors.accent} style={styles.right}>
                  {step.reveal.reading}
                </AppText>
              </View>
            </View>
          ) : null}
          {step.explain ? (
            <AppText variant="caption" muted>
              {step.explain}
            </AppText>
          ) : null}
          <NextButton title="Continuer" onPress={onNext} loading={busy} />
        </View>
      ) : null}
    </View>
  );
}

/** Tracer une lettre au doigt sur le modèle (non noté). */
function TraceStep({ step, letters, onNext }: StepProps & { step: Extract<ReadingStep, { type: "trace" }> }) {
  const colors = useColors();
  const letter = letters.get(step.letterId);
  const [drawn, setDrawn] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showModel, setShowModel] = useState(true);
  if (!letter) return null;
  return (
    <View style={styles.body}>
      <View>
        <AppText variant="headline">Tracez la lettre {letter.name}</AppText>
        <AppText variant="caption" muted>
          Suivez le modèle avec le doigt, puis ajoutez les points.
        </AppText>
      </View>
      <TracePad key={attempt} glyph={letter.char} showModel={showModel} onDraw={setDrawn} />
      <View style={styles.traceActions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            setAttempt((a) => a + 1);
            setDrawn(false);
          }}
          style={styles.link}>
          <AppText variant="bodyStrong" color={colors.primary}>
            Effacer
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => setShowModel((m) => !m)} style={styles.link}>
          <AppText variant="bodyStrong" color={colors.primary}>
            {showModel ? "Sans modèle" : "Avec modèle"}
          </AppText>
        </Pressable>
      </View>
      <View style={styles.flex} />
      <NextButton title={drawn ? "Continuer" : "Passer"} variant={drawn ? "primary" : "ghost"} onPress={onNext} />
    </View>
  );
}

/** Composer un mot du Coran en touchant ses lettres dans l'ordre ; elles s'attachent d'elles-mêmes. */
function SpellStep({ step, onAnswer, onNext, busy }: StepProps & { step: Extract<ReadingStep, { type: "spell" }> }) {
  const colors = useColors();
  const [chosen, setChosen] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const typed = chosen.map((i) => step.tiles[i]!);

  function tap(index: number) {
    if (result !== null || chosen.includes(index)) return;
    void Haptics.selectionAsync();
    const next = [...chosen, index];
    setChosen(next);
    if (next.length === step.answer.length) {
      const ok = next.every((i, k) => step.tiles[i] === step.answer[k]);
      void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
      setResult(ok);
      onAnswer(ok);
    }
  }

  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="headline">Composez le mot</AppText>
        <Card style={styles.prompt}>
          <View style={styles.reveal}>
            <PlayButton url={step.word.audioUrl} label="Écouter le mot" size={44} />
            <AppText variant="title" italic color={colors.accent}>
              {step.word.reading}
            </AppText>
          </View>
          <View style={[styles.spellAnswer, { borderBottomColor: colors.border }]}>
            <ArabicText size={48} center color={result === false ? colors.danger : result ? colors.success : colors.arabic} style={styles.spellLine}>
              {typed.join("") || " "}
            </ArabicText>
          </View>
          <AppText variant="caption" muted center>
            {typed.length}/{step.answer.length} lettres
          </AppText>
        </Card>
        <View style={[styles.grid, styles.centered]}>
          {step.tiles.map((c, i) => (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Lettre ${c}`}
              disabled={chosen.includes(i) || result !== null}
              onPress={() => tap(i)}
              style={({ pressed }) => [
                styles.letterTile,
                { backgroundColor: colors.surface, borderColor: colors.border, opacity: chosen.includes(i) ? 0.3 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}>
              <ArabicText size={36} center style={styles.choiceGlyph}>
                {c}
              </ArabicText>
            </Pressable>
          ))}
        </View>
        {result === null && chosen.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => setChosen((c) => c.slice(0, -1))} style={styles.link}>
            <AppText variant="bodyStrong" color={colors.primary}>
              Effacer la dernière lettre
            </AppText>
          </Pressable>
        ) : null}
      </ScrollView>
      {result !== null ? (
        <View style={[styles.feedback, { backgroundColor: result ? colors.successSoft : colors.dangerSoft }]}>
          <View style={styles.feedbackRow}>
            <Ionicons name={result ? "checkmark-circle" : "close-circle"} size={26} color={result ? colors.success : colors.danger} />
            <AppText variant="headline" color={result ? colors.success : colors.danger}>
              {result ? "Excellent !" : "Pas tout à fait"}
            </AppText>
          </View>
          <View style={styles.reveal}>
            <PlayButton url={step.word.audioUrl} label="Écouter le mot" size={44} autoPlay />
            <View style={styles.flex}>
              <ArabicText size={30}>{step.word.text}</ArabicText>
              {!result ? (
                <AppText variant="caption" muted style={styles.right}>
                  Lettres : {step.answer.join(" ")}
                </AppText>
              ) : null}
            </View>
          </View>
          <NextButton title="Continuer" onPress={onNext} loading={busy} />
        </View>
      ) : null}
    </View>
  );
}

function MatchView({ step, onAnswer, onNext, busy }: StepProps & { step: Extract<ReadingStep, { type: "match" }> }) {
  const colors = useColors();
  const right = useMemo(() => [...step.pairs].sort((a, b) => a.text.localeCompare(b.text)), [step.pairs]);
  const [selected, setSelected] = useState<string | null>(null);
  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  // Effacement du « faux » après un instant, annulé si l'exercice disparaît avant.
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (wrongTimer.current) clearTimeout(wrongTimer.current);
  }, []);
  const [mistakes, setMistakes] = useState(0);
  const done = matched.size === step.pairs.length;

  function chooseRight(id: string) {
    if (!selected || matched.has(id)) return;
    if (id === selected) {
      void Haptics.selectionAsync();
      const next = new Set(matched).add(id);
      setMatched(next);
      setSelected(null);
      if (next.size === step.pairs.length) onAnswer(mistakes === 0);
    } else {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setMistakes((m) => m + 1);
      setWrong(id);
      if (wrongTimer.current) clearTimeout(wrongTimer.current);
      wrongTimer.current = setTimeout(() => setWrong(null), 500);
    }
  }

  const tile = (active: boolean, isMatched: boolean, isWrong: boolean) => [
    styles.matchTile,
    {
      backgroundColor: isMatched ? colors.surfaceMuted : active ? colors.primarySoft : isWrong ? colors.dangerSoft : colors.surface,
      borderColor: active ? colors.primary : isWrong ? colors.danger : colors.border,
      opacity: isMatched ? 0.4 : 1,
    },
  ];

  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="headline">{step.question}</AppText>
        <View style={styles.columns}>
          <View style={styles.flexColumn}>
            {step.pairs.map((p) => (
              <Pressable key={p.id} accessibilityRole="button" disabled={matched.has(p.id)} onPress={() => setSelected(p.id)} style={tile(selected === p.id, matched.has(p.id), false)}>
                <ArabicText size={40} center style={styles.matchGlyph}>
                  {p.arabic}
                </ArabicText>
              </Pressable>
            ))}
          </View>
          <View style={styles.flexColumn}>
            {right.map((p) => (
              <Pressable key={p.id} accessibilityRole="button" disabled={matched.has(p.id)} onPress={() => chooseRight(p.id)} style={tile(false, matched.has(p.id), wrong === p.id)}>
                <AppText variant="bodyStrong" center>
                  {p.text}
                </AppText>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
      {done ? <NextButton title="Continuer" onPress={onNext} loading={busy} /> : null}
    </View>
  );
}

/** Lecture guidée : toucher un mot pour l'entendre et voir comment il se lit. */
function GuidedReading({ step, onNext }: StepProps & { step: Extract<ReadingStep, { type: "reading" }> }) {
  const colors = useColors();
  const audio = useOneShot();
  const [shown, setShown] = useState<Set<string>>(new Set());
  const [showAll, setShowAll] = useState(false);

  function tap(word: ReadingWord) {
    setShown((s) => new Set(s).add(word.location));
    if (word.audioUrl) audio.play(word.audioUrl);
  }

  return (
    <View style={styles.body}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <AppText variant="headline">{step.title}</AppText>
        <AppText muted>Lisez chaque mot, puis touchez-le pour l’écouter et vérifier votre lecture.</AppText>
        {step.verses.map((verse) => (
          <Card key={verse.verseKey} style={styles.verse}>
            <View style={styles.verseWords}>
              {verse.words.map((word) => {
                const visible = showAll || shown.has(word.location);
                return (
                  <Pressable
                    key={word.location}
                    accessibilityRole="button"
                    accessibilityLabel={visible ? `${word.text}, ${word.reading}` : `${word.text}, toucher pour écouter`}
                    onPress={() => tap(word)}
                    style={({ pressed }) => [styles.verseWord, pressed && { backgroundColor: colors.primarySoft }]}>
                    <ArabicText size={30} center>
                      {word.text}
                    </ArabicText>
                    <AppText variant="caption" italic center color={visible ? colors.accent : "transparent"}>
                      {word.reading}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="caption" faint style={styles.right}>
              {verse.verseKey}
            </AppText>
          </Card>
        ))}
        <Pressable accessibilityRole="button" onPress={() => setShowAll((s) => !s)} style={styles.link}>
          <AppText variant="bodyStrong" color={colors.primary}>
            {showAll ? "Masquer la lecture" : "Afficher toute la lecture"}
          </AppText>
        </Pressable>
      </ScrollView>
      <NextButton title="Passer aux exercices" onPress={onNext} />
    </View>
  );
}

function Result({ title, result, nextLesson }: { title: string; result: ReadingResult; nextLesson: { id: string; title: string } | null }) {
  const colors = useColors();
  const kids = useKidsMode();
  const kc = useKidsColors();
  if (kids) {
    return (
      <SafeArea style={[styles.flex, styles.result, { backgroundColor: colors.background }]}>
        <Ionicons name="star" size={118} color={KIDS.sun} />
        <AppText variant="display" center>
          Leçon terminée !
        </AppText>
        <AppText muted center>
          {title} · Bâraka Allâhou fîk !
        </AppText>
        <View style={[styles.kidsScore, { backgroundColor: kc.sunSoft }]}>
          <Ionicons name="checkmark-circle" size={26} color={KIDS.sunStroke} />
          <AppText variant="headline" color={kc.onSunSoft}>
            {result.score} % de bonnes réponses
          </AppText>
        </View>
        <View style={styles.flex} />
        {nextLesson ? <BigButton title="Leçon suivante" icon="arrow-forward" onPress={() => router.replace({ pathname: "/reading/session", params: { lessonId: nextLesson.id } })} /> : null}
        <BigButton title="Retour aux lettres" icon="home" tone={nextLesson ? "white" : "green"} onPress={() => closeScreen("/reading")} />
      </SafeArea>
    );
  }
  return (
    <SafeArea style={[styles.flex, styles.result, { backgroundColor: colors.background }]}>
      <View style={[styles.trophy, { backgroundColor: colors.accentSoft }]}>
        <Ionicons name="ribbon-outline" size={44} color={colors.accent} />
      </View>
      <AppText variant="display" center>
        Leçon terminée
      </AppText>
      <AppText muted center>
        {title} · Bâraka Allâhou fîk !
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
      {nextLesson ? (
        <Button
          title={`Leçon suivante : ${nextLesson.title}`}
          icon="arrow-forward"
          onPress={() => router.replace({ pathname: "/reading/session", params: { lessonId: nextLesson.id } })}
          style={styles.stretch}
        />
      ) : null}
      <Button title="Terminer" variant={nextLesson ? "ghost" : "primary"} onPress={() => closeScreen("/reading")} style={styles.stretch} />
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexColumn: { flex: 1, gap: spacing.md },
  right: { textAlign: "right" },
  stretch: { alignSelf: "stretch" },
  topBar: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  body: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  scroll: { gap: spacing.lg, paddingBottom: spacing.lg },
  badge: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "center", paddingHorizontal: spacing.md, paddingVertical: 5, borderRadius: radius.pill },
  paragraph: { lineHeight: 24 },
  examples: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  exampleCard: { flexGrow: 1, flexBasis: "40%", alignItems: "center", gap: 2, paddingVertical: spacing.md },
  prompt: { paddingVertical: spacing.xl, alignItems: "center", gap: spacing.md },
  play: { alignItems: "center", justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: { flexBasis: "46%", flexGrow: 1, borderWidth: 1.5, borderRadius: radius.lg, minHeight: 92, justifyContent: "center", alignItems: "center" },
  list: { gap: spacing.md },
  choice: { borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.lg, minHeight: 60, justifyContent: "center" },
  feedback: { margin: -spacing.lg, marginTop: 0, padding: spacing.xl, gap: spacing.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  feedbackRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  reveal: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  answerRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  /** Lettres isolées : place pour les queues qui descendent (ج ح خ م…). */
  glyphLine: { lineHeight: 70, paddingBottom: 14 },
  choiceGlyph: { lineHeight: 84, paddingBottom: 14 },
  promptGlyph: { lineHeight: 160, paddingBottom: 24 },
  matchGlyph: { lineHeight: 76, paddingBottom: 12 },
  traceActions: { flexDirection: "row", justifyContent: "center", gap: spacing.xl },
  spellAnswer: { alignSelf: "stretch", borderBottomWidth: StyleSheet.hairlineWidth, minHeight: 90, justifyContent: "center" },
  spellLine: { lineHeight: 100, paddingBottom: 8 },
  centered: { justifyContent: "center" },
  letterTile: { width: "22%", borderWidth: 1.5, borderRadius: radius.lg, minHeight: 76, justifyContent: "center", alignItems: "center" },
  columns: { flexDirection: "row", gap: spacing.md },
  matchTile: { borderWidth: 1.5, borderRadius: radius.lg, minHeight: 72, padding: spacing.sm, justifyContent: "center" },
  verse: { gap: spacing.xs },
  verseWords: { flexDirection: "row-reverse", flexWrap: "wrap", columnGap: spacing.sm },
  verseWord: { borderRadius: radius.sm, paddingHorizontal: 6, alignItems: "center" },
  link: { alignSelf: "center", paddingHorizontal: spacing.xs, minHeight: 44, justifyContent: "center" },
  result: { padding: spacing.xl, alignItems: "center", justifyContent: "center", gap: spacing.lg },
  kidsScore: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 2, borderRadius: radius.pill },
  trophy: { width: 96, height: 96, borderRadius: 48, alignItems: "center", justifyContent: "center" },
  resultStats: { flexDirection: "row", gap: spacing.md, alignSelf: "stretch" },
});
