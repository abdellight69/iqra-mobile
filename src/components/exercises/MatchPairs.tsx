import * as Haptics from "expo-haptics";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { shufflePairs } from "@/lib/shuffle";
import { radius, spacing, useColors } from "@/lib/theme";
import { transliterate } from "@/lib/transliterate";
import type { Exercise } from "@/lib/types";
import { AppText } from "../AppText";
import { ArabicText } from "../ArabicText";
import { exerciseStyles, type ExerciseProps, Feedback, Phonetic } from "./shared";

type Match = Extract<Exercise, { type: "match" }>;

/**
 * Relier chaque mot arabe (avec sa phonétique) à son sens. Les deux colonnes sont mélangées
 * indépendamment : la bonne réponse n'est jamais en face.
 */
export function MatchPairs({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps<Match>) {
  const colors = useColors();
  const [{ left, right }] = useState(() => shufflePairs(exercise.wordIds));
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
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <AppText variant="headline">Associez chaque mot à son sens</AppText>
        <View style={styles.columns}>
          <View style={styles.column}>
            {left.map((id) => {
              const arabic = byId.get(id)?.headword ?? "";
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  accessibilityLabel={`${arabic}, ${transliterate(arabic)}`}
                  accessibilityState={{ selected: selected === id, disabled: matched.has(id) }}
                  disabled={matched.has(id)}
                  onPress={() => setSelected(id)}
                  style={tile(selected === id, matched.has(id), false)}>
                  <ArabicText size={26} center>
                    {arabic}
                  </ArabicText>
                  <Phonetic text={transliterate(arabic)} size={12} center numberOfLines={1} />
                </Pressable>
              );
            })}
          </View>
          <View style={styles.column}>
            {right.map((id) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={byId.get(id)?.fr ?? ""}
                accessibilityState={{ disabled: matched.has(id) }}
                disabled={matched.has(id)}
                onPress={() => chooseRight(id)}
                style={tile(false, matched.has(id), wrong === id)}>
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

const styles = StyleSheet.create({
  columns: { flexDirection: "row", gap: spacing.md },
  column: { flex: 1, gap: spacing.md },
  tile: { borderWidth: 1.5, borderRadius: radius.lg, minHeight: 80, padding: spacing.sm, justifyContent: "center", gap: 2 },
});
