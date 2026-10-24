import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { type KidTone, useKidsMode } from "@/lib/kids";
import { radius, spacing, useColors } from "@/lib/theme";
import { errorsLabel, type ExerciseWord, fillBlanks, SLOT } from "@/lib/verse-exercises";
import { AppText } from "../AppText";
import { ArabicText } from "../ArabicText";
import { Card } from "../Card";
import { exerciseStyles } from "./shared";
import { DrillSummary, ExerciseTile, SkipButton } from "./VerseOrderExercise";

const TONES: KidTone[] = ["green", "orange", "violet"];

export type FillVerseExerciseProps = {
  /** Mots du verset (déjà filtrés : `type === "word"`), dans l'ordre. */
  words: ExerciseWord[];
  /** Mots d'un verset voisin, distracteurs de secours pour un verset court. */
  neighbours?: string[];
  onDone: (errors: number) => void;
  onSkip?: () => void;
};

/**
 * « Compléter le verset » : le verset avec un à trois mots cachés (▢), trois propositions pour
 * le trou en cours (le bon mot et deux mots du même verset ou d'un verset voisin). Retour
 * immédiat : la bonne proposition s'inscrit en vert, une fausse rougit et reste barrée ; on
 * compte les erreurs, qui ne changent pas la note de mémorisation.
 */
export function FillVerseExercise({ words, neighbours = [], onDone, onSkip }: FillVerseExerciseProps) {
  const colors = useColors();
  const kids = useKidsMode();
  // Trous tirés une fois à l'ouverture : un voisin arrivé plus tard ne rebat pas les cartes.
  const [blanks] = useState(() => fillBlanks(words.map((w) => w.textUthmani), neighbours));
  const [current, setCurrent] = useState(0);
  const [errors, setErrors] = useState(0);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const blank = blanks[current];
  const finished = blanks.length > 0 && current >= blanks.length;

  function pick(option: string) {
    if (!blank || finished) return;
    if (option === blank.answer) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setWrong(new Set());
      setCurrent((c) => c + 1);
      return;
    }
    setErrors((e) => e + 1);
    setWrong((w) => new Set(w).add(option));
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  if (blanks.length === 0) return null;
  const hiddenAt = new Map(blanks.map((b, i) => [b.index, i]));

  return (
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <View style={styles.heading}>
          <AppText variant="headline">{kids ? "Complète le verset" : "Compléter le verset"}</AppText>
          <AppText variant="caption" muted>
            {kids ? "Quel mot va dans la case ?" : `Choisissez le mot qui manque${blanks.length > 1 ? ", trou après trou" : ""}.`}
          </AppText>
        </View>
        <Card style={styles.card}>
          <View style={styles.row} accessibilityLabel={`Verset avec ${blanks.length} mot${blanks.length > 1 ? "s" : ""} caché${blanks.length > 1 ? "s" : ""}`}>
            {words.map((word, index) => {
              const blankIndex = hiddenAt.get(index);
              if (blankIndex === undefined) {
                return (
                  <ArabicText key={word.location} size={kids ? 32 : 28} accessible={false}>
                    {word.textUthmani}
                  </ArabicText>
                );
              }
              const solved = blankIndex < current;
              const active = blankIndex === current;
              return solved ? (
                <ArabicText key={word.location} size={kids ? 32 : 28} color={colors.success} accessible={false}>
                  {word.textUthmani}
                </ArabicText>
              ) : (
                <View key={word.location} style={[styles.slot, { borderColor: active ? colors.accent : colors.border, backgroundColor: active ? colors.accentSoft : colors.surfaceMuted }]} accessible={false}>
                  <ArabicText size={kids ? 32 : 28} color={active ? colors.accent : colors.textFaint} center accessible={false}>
                    {SLOT}
                  </ArabicText>
                </View>
              );
            })}
          </View>
        </Card>
        {blank ? (
          <View style={styles.options}>
            {blank.options.map((option, i) => (
              <ExerciseTile
                key={option}
                text={option}
                label={`Proposition ${option}`}
                state={wrong.has(option) ? "wrong" : "idle"}
                tone={TONES[i % TONES.length]}
                disabled={wrong.has(option)}
                onPress={() => pick(option)}
              />
            ))}
          </View>
        ) : null}
        {errors > 0 && !finished ? (
          <AppText variant="caption" color={colors.accent} center>
            {errorsLabel(errors).replace(/^./, (c) => c.toUpperCase())}
          </AppText>
        ) : null}
      </ScrollView>
      {finished ? <DrillSummary title={kids ? "Verset complété !" : "Verset complété"} errors={errors} onNext={() => onDone(errors)} /> : onSkip ? <SkipButton onPress={onSkip} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xs },
  card: { gap: spacing.md },
  row: { flexDirection: "row-reverse", flexWrap: "wrap", alignItems: "center", columnGap: spacing.sm, rowGap: spacing.xs },
  slot: { minWidth: 56, minHeight: 44, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xs },
  options: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.md, justifyContent: "center" },
});
