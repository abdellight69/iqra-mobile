import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { GameExercise } from "@/lib/exercises";
import { radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "../AppText";
import { Card } from "../Card";
import { exerciseStyles, type ExerciseProps, Feedback, WordSummary } from "./shared";

type TrueFalse = Extract<GameExercise, { type: "true_false" }>;

/** Le mot (arabe et phonétique) et un sens proposé : vrai ou faux ? */
export function TrueFalseExercise({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps<TrueFalse>) {
  const colors = useColors();
  const word = byId.get(exercise.wordId);
  const [picked, setPicked] = useState<boolean | null>(null);
  const correct = picked === exercise.isTrue;

  function pick(value: boolean) {
    if (picked !== null) return;
    setPicked(value);
    const ok = value === exercise.isTrue;
    void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    onAnswer(exercise.wordId, ok, null);
  }

  if (!word) return null;

  const button = (value: boolean, icon: "checkmark" | "close", title: string) => {
    const tone = value ? colors.success : colors.danger;
    const soft = value ? colors.successSoft : colors.dangerSoft;
    const chosen = picked === value;
    const isAnswer = picked !== null && value === exercise.isTrue;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ disabled: picked !== null, selected: chosen }}
        disabled={picked !== null}
        onPress={() => pick(value)}
        style={({ pressed }) => [
          styles.answer,
          {
            backgroundColor: isAnswer ? soft : chosen ? colors.surfaceMuted : colors.surface,
            borderColor: isAnswer || picked === null ? tone : colors.border,
            opacity: picked !== null && !isAnswer && !chosen ? 0.5 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}>
        <Ionicons name={icon} size={30} color={tone} />
        <AppText variant="headline" color={tone}>
          {title}
        </AppText>
      </Pressable>
    );
  };

  return (
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <AppText variant="headline">Vrai ou faux ?</AppText>
        <Card style={exerciseStyles.prompt}>
          <WordSummary word={word} showMeaning={false} />
          <View style={[styles.proposal, { backgroundColor: colors.surfaceMuted }]}>
            <AppText variant="label" muted center>
              signifie
            </AppText>
            <AppText variant="title" center>
              {exercise.proposed}
            </AppText>
          </View>
        </Card>
        <View style={exerciseStyles.row}>
          {button(true, "checkmark", "Vrai")}
          {button(false, "close", "Faux")}
        </View>
      </ScrollView>
      {picked !== null ? <Feedback correct={correct} word={word} onNext={onNext} loading={submitting} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  proposal: { alignSelf: "stretch", marginHorizontal: spacing.md, padding: spacing.md, borderRadius: radius.md, gap: 2 },
  answer: { flex: 1, minHeight: 88, borderWidth: 1.5, borderRadius: radius.lg, alignItems: "center", justifyContent: "center", gap: spacing.xs },
});
