import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { shuffle } from "@/lib/shuffle";
import { spacing } from "@/lib/theme";
import { annotateArabic, transliterate } from "@/lib/transliterate";
import type { Exercise } from "@/lib/types";
import { AppText } from "../AppText";
import { ArabicText } from "../ArabicText";
import { Card } from "../Card";
import { ChoiceButton, exerciseStyles, type ExerciseProps, Feedback, Phonetic } from "./shared";

type Contrast = Extract<Exercise, { type: "contrast" }>;

/**
 * Deux mots qui se ressemblent (هَذَا / هَذِهِ), tous deux connus : on donne le sens de l'un, on
 * choisit lequel des deux c'est. Après la réponse, les deux mots sont montrés côte à côte avec
 * leur sens et leur note du livre, pour fixer la différence.
 */
export function ContrastExercise({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps<Contrast>) {
  const word = byId.get(exercise.wordId);
  const other = byId.get(exercise.otherId);
  const [order] = useState(() => shuffle([exercise.wordId, exercise.otherId]));
  const [picked, setPicked] = useState<string | null>(null);
  const correct = picked === exercise.wordId;

  function pick(id: string) {
    if (picked) return;
    setPicked(id);
    const ok = id === exercise.wordId;
    void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    onAnswer(exercise.wordId, ok, null);
  }

  if (!word || !other) return null;

  return (
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <AppText variant="headline">Deux mots qui se ressemblent : lequel signifie…</AppText>
        <Card style={exerciseStyles.prompt}>
          <AppText variant="title" center>
            {word.fr}
          </AppText>
        </Card>
        <View style={styles.pair}>
          {order.map((id) => {
            const w = byId.get(id)!;
            const arabic = w.headword ?? w.ar ?? "";
            const state = !picked ? "idle" : id === exercise.wordId ? "right" : id === picked ? "wrong" : "idle";
            return (
              <View key={id} style={styles.half}>
                <ChoiceButton state={state} disabled={Boolean(picked)} onPress={() => pick(id)} label={`${arabic}, ${transliterate(arabic)}`}>
                  <View style={styles.choice}>
                    <ArabicText size={34} center>
                      {arabic}
                    </ArabicText>
                    <Phonetic text={transliterate(arabic)} size={14} center numberOfLines={1} />
                    {picked ? (
                      <>
                        <AppText variant="caption" center>
                          {w.fr}
                        </AppText>
                        {w.arNote ? (
                          <AppText variant="caption" muted center numberOfLines={2}>
                            {annotateArabic(w.arNote)}
                          </AppText>
                        ) : null}
                      </>
                    ) : null}
                  </View>
                </ChoiceButton>
              </View>
            );
          })}
        </View>
        <AppText variant="caption" muted center>
          {picked ? "Retenez ce qui les distingue : la lettre qui change, et le sens qui va avec." : "Vous connaissez déjà ces deux mots : à vous de les départager."}
        </AppText>
      </ScrollView>
      {picked ? <Feedback correct={correct} onNext={onNext} loading={submitting} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
  choice: { alignItems: "center", gap: spacing.xs },
});
