import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { GameExercise } from "@/lib/exercises";
import { wordImage } from "@/lib/kids";
import { radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "../AppText";
import { Card } from "../Card";
import { ArabicChoice, ChoiceButton, exerciseStyles, type ExerciseProps, Feedback, PlayButton, useWordAudio, WordSummary } from "./shared";

type PickImage = Extract<GameExercise, { type: "pick_image" }>;
type ImageToArabic = Extract<GameExercise, { type: "image_to_ar" }>;

/**
 * On entend et on lit le mot, on touche son image parmi quatre. Les quatre choix sont des mots
 * illustrés de la séance ; la réponse ratée fait revenir le jeu en fin de séance.
 */
export function PickImageExercise({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps<PickImage>) {
  const colors = useColors();
  const word = byId.get(exercise.wordId);
  const audio = useWordAudio(exercise.wordId);
  const [picked, setPicked] = useState<string | null>(null);
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
        <AppText variant="headline">Touche la bonne image</AppText>
        <Card style={exerciseStyles.prompt}>
          <WordSummary word={word} size={40} showMeaning={false} />
          {audio.url ? <PlayButton playing={audio.playing} onPress={audio.play} /> : null}
        </Card>
        <View style={styles.grid}>
          {exercise.choices.map((choice) => {
            const image = wordImage(byId.get(choice.id) ?? { imageUrl: null });
            const isAnswer = choice.id === exercise.answerId;
            const state = !picked ? "idle" : isAnswer ? "right" : choice.id === picked ? "wrong" : "idle";
            return (
              <Pressable
                key={choice.id}
                accessibilityRole="button"
                accessibilityLabel={choice.text}
                accessibilityState={{ disabled: Boolean(picked) }}
                disabled={Boolean(picked)}
                onPress={() => pick(choice.id)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    backgroundColor: state === "right" ? colors.successSoft : state === "wrong" ? colors.dangerSoft : colors.surface,
                    borderColor: state === "right" ? colors.success : state === "wrong" ? colors.danger : colors.border,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  },
                ]}>
                {image ? <Image source={image} style={styles.image} contentFit="contain" /> : <AppText center>{choice.text}</AppText>}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
      {picked ? <Feedback correct={correct} word={word} onNext={onNext} loading={submitting} /> : null}
    </View>
  );
}

/** On voit l'image du mot, on choisit sa forme arabe parmi quatre. */
export function ImageToArabicExercise({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps<ImageToArabic>) {
  const word = byId.get(exercise.wordId);
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === exercise.answerId;

  function pick(id: string) {
    if (picked) return;
    setPicked(id);
    const ok = id === exercise.answerId;
    void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    onAnswer(exercise.wordId, ok, ok ? null : { ...exercise, choices: [...exercise.choices].reverse() });
  }

  if (!word) return null;
  const image = wordImage(word);

  return (
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <AppText variant="headline">Comment ça s’appelle ?</AppText>
        <Card style={exerciseStyles.prompt}>
          {image ? <Image source={image} style={styles.promptImage} contentFit="contain" accessibilityLabel={word.fr ?? undefined} /> : null}
          <AppText variant="title" center>
            {word.fr}
          </AppText>
        </Card>
        <View style={exerciseStyles.choices}>
          {exercise.choices.map((choice) => {
            const isAnswer = choice.id === exercise.answerId;
            const state = !picked ? "idle" : isAnswer ? "right" : choice.id === picked ? "wrong" : "idle";
            return (
              <ChoiceButton key={choice.id} state={state} disabled={Boolean(picked)} onPress={() => pick(choice.id)} label={choice.text}>
                <ArabicChoice text={choice.text} />
              </ChoiceButton>
            );
          })}
        </View>
      </ScrollView>
      {picked ? <Feedback correct={correct} word={word} onNext={onNext} loading={submitting} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  tile: { width: "47%", flexGrow: 1, aspectRatio: 1, borderRadius: radius.xl, borderWidth: 3, alignItems: "center", justifyContent: "center", padding: spacing.sm },
  image: { width: "88%", height: "88%" },
  promptImage: { width: 150, height: 150 },
});
