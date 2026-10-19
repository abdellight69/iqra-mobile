import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { BLANK, type GameExercise } from "@/lib/exercises";
import { spacing, useColors } from "@/lib/theme";
import { AppText } from "../AppText";
import { ArabicText } from "../ArabicText";
import { Card } from "../Card";
import { ChoiceButton, exerciseStyles, type ExerciseProps, Feedback } from "./shared";

type MissingLetter = Extract<GameExercise, { type: "missing_letter" }>;

/** Le mot avec une lettre effacée et son sens : on choisit la lettre manquante parmi quatre. */
export function MissingLetterExercise({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps<MissingLetter>) {
  const colors = useColors();
  const word = byId.get(exercise.wordId);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === exercise.answer;
  const [before, after] = exercise.masked.split(BLANK);

  function pick(letter: string) {
    if (picked) return;
    setPicked(letter);
    const ok = letter === exercise.answer;
    void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    onAnswer(exercise.wordId, ok, null);
  }

  if (!word) return null;

  return (
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <AppText variant="headline">Quelle lettre manque ?</AppText>
        <Card style={exerciseStyles.prompt}>
          <ArabicText size={44} center accessibilityLabel={`Mot à compléter, une lettre manque : ${word.fr}`}>
            {before}
            <Text style={{ color: picked ? (correct ? colors.success : colors.danger) : colors.accent }}>{picked ? exercise.answer : BLANK}</Text>
            {after}
          </ArabicText>
          <AppText variant="title" center>
            {word.fr}
          </AppText>
        </Card>
        <View style={styles.letters}>
          {exercise.choices.map((letter) => {
            const state = !picked ? "idle" : letter === exercise.answer ? "right" : letter === picked ? "wrong" : "idle";
            return (
              <View key={letter} style={styles.letter}>
                <ChoiceButton state={state} disabled={Boolean(picked)} onPress={() => pick(letter)} label={`Lettre ${letter}`}>
                  <ArabicText size={34} center>
                    {letter}
                  </ArabicText>
                </ChoiceButton>
              </View>
            );
          })}
        </View>
      </ScrollView>
      {picked ? <Feedback correct={correct} word={word} onNext={onNext} loading={submitting} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  letters: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.md },
  letter: { width: "47%", flexGrow: 1 },
});
