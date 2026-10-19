import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useAuth } from "@/lib/auth-store";
import type { GameExercise } from "@/lib/exercises";
import { useVerse, useWordExample } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import { transliterate } from "@/lib/transliterate";
import type { Word } from "@/lib/types";
import { AppText } from "../AppText";
import { ArabicText } from "../ArabicText";
import { Button } from "../Button";
import { Card } from "../Card";
import { exerciseStyles, type ExerciseProps, Feedback, Phonetic, WordSummary } from "./shared";

type InVerse = Extract<GameExercise, { type: "in_verse" }>;

/** Au-delà de ce nombre de mots, on ne montre qu'une fenêtre du verset autour du mot cherché. */
const WINDOW = 13;

/**
 * Retrouver le mot dans le verset où il apparaît (première occurrence trouvée par le Corpus) :
 * les mots du verset sont présentés avec leur phonétique, on touche celui qui a le sens demandé.
 */
export function InVerseExercise({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps<InVerse>) {
  const colors = useColors();
  const word = byId.get(exercise.wordId);
  const translationId = useAuth((s) => s.user?.translationId ?? null);
  const example = useWordExample(exercise.wordId);
  const verse = useVerse(example.data?.verseKey ?? "", translationId);
  const [picked, setPicked] = useState<Word | null>(null);
  const target = example.data?.word ?? null;

  if (!word) return null;

  // Exemple introuvable ou verset indisponible : on revoit simplement le mot, sans le noter.
  if ((example.isSuccess && !example.data) || verse.isError) {
    return (
      <View style={exerciseStyles.body}>
        <ScrollView contentContainerStyle={exerciseStyles.scroll}>
          <AppText variant="headline">Un mot à revoir</AppText>
          <Card style={exerciseStyles.prompt}>
            <WordSummary word={word} />
          </Card>
        </ScrollView>
        <Button title="Continuer" onPress={onNext} loading={submitting} />
      </View>
    );
  }

  const words = verse.data?.words.filter((w) => w.type === "word") ?? [];
  const targetIndex = target ? words.findIndex((w) => w.position === target.position) : -1;
  let shown = words;
  let truncatedStart = false;
  let truncatedEnd = false;
  if (words.length > WINDOW && targetIndex >= 0) {
    const start = Math.max(0, Math.min(targetIndex - Math.floor(WINDOW / 2), words.length - WINDOW));
    shown = words.slice(start, start + WINDOW);
    truncatedStart = start > 0;
    truncatedEnd = start + WINDOW < words.length;
  }
  const isTarget = (w: Word) => target !== null && (w.position === target.position || w.textUthmani === target.textUthmani);
  const correct = picked !== null && isTarget(picked);
  const [chapter, verseNumber] = (example.data?.verseKey ?? ":").split(":");

  function pick(w: Word) {
    if (picked) return;
    setPicked(w);
    const ok = isTarget(w);
    void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    onAnswer(exercise.wordId, ok, null);
  }

  return (
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <AppText variant="headline">Retrouvez le mot dans le verset</AppText>
        <Card style={styles.prompt}>
          <AppText variant="label" muted>
            Touchez le mot qui signifie
          </AppText>
          <AppText variant="title">{word.fr}</AppText>
          {word.headword ? <Phonetic text={transliterate(word.headword)} /> : null}
        </Card>
        {!verse.data || !target ? (
          <ActivityIndicator color={colors.primary} style={styles.loading} />
        ) : (
          <View style={styles.verse}>
            <AppText variant="caption" faint style={styles.ref}>
              Sourate {chapter}, verset {verseNumber}
              {truncatedStart || truncatedEnd ? " (extrait)" : ""}
            </AppText>
            <View style={styles.words}>
              {truncatedStart ? <Ellipsis /> : null}
              {shown.map((w) => {
                const state = !picked ? "idle" : isTarget(w) ? "right" : w.position === picked.position ? "wrong" : "idle";
                return (
                  <Pressable
                    key={w.location}
                    accessibilityRole="button"
                    accessibilityLabel={`${w.textUthmani}, ${w.transliteration ?? transliterate(w.textUthmani)}`}
                    disabled={Boolean(picked)}
                    onPress={() => pick(w)}
                    style={({ pressed }) => [
                      styles.word,
                      {
                        backgroundColor: state === "right" ? colors.successSoft : state === "wrong" ? colors.dangerSoft : pressed ? colors.accentSoft : colors.surface,
                        borderColor: state === "right" ? colors.success : state === "wrong" ? colors.danger : colors.border,
                      },
                    ]}>
                    <ArabicText size={24} center>
                      {w.textUthmani}
                    </ArabicText>
                    <Phonetic text={w.transliteration ?? transliterate(w.textUthmani)} size={11} center numberOfLines={1} />
                  </Pressable>
                );
              })}
              {truncatedEnd ? <Ellipsis /> : null}
            </View>
            {picked && verse.data.translation ? (
              <AppText variant="caption" muted>
                {verse.data.translation.text}
              </AppText>
            ) : null}
          </View>
        )}
      </ScrollView>
      {picked ? <Feedback correct={correct} word={word} onNext={onNext} loading={submitting} /> : null}
    </View>
  );
}

function Ellipsis() {
  return (
    <View style={styles.ellipsis}>
      <AppText variant="headline" faint>
        …
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  prompt: { gap: spacing.xs },
  loading: { marginVertical: spacing.xl },
  verse: { gap: spacing.sm },
  ref: { textAlign: "right" },
  words: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  word: { borderWidth: 1.5, borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minHeight: 56, minWidth: 56, alignItems: "center", justifyContent: "center" },
  ellipsis: { minHeight: 56, justifyContent: "center", paddingHorizontal: spacing.xs },
});
