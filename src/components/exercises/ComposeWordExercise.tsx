import * as Haptics from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import type { GameExercise } from "@/lib/exercises";
import { type KidTone, useKidsMode, wordImage } from "@/lib/kids";
import { spacing, useColors } from "@/lib/theme";
import { errorsLabel, type Tile } from "@/lib/verse-exercises";
import { AppText } from "../AppText";
import { ArabicText } from "../ArabicText";
import { Card } from "../Card";
import { exerciseStyles, type ExerciseProps, Feedback, PlayButton, useWordAudio } from "./shared";
import { BuiltRow, ExerciseTile } from "./VerseOrderExercise";

type Compose = Extract<GameExercise, { type: "compose" }>;

const TONES: KidTone[] = ["sun", "blue", "green", "orange", "violet", "pink"];
const WRONG_FLASH_MS = 450;

/**
 * « Composer le mot » : le sens du mot (et son image pour un enfant), ses lettres isolées
 * mélangées en tuiles, à toucher dans l'ordre. Une lettre fausse vibre, rougit et revient ; la
 * réponse compte juste si le mot est composé sans erreur. Enfant : le mot est récité à l'ouverture.
 */
export function ComposeWordExercise({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps<Compose>) {
  const colors = useColors();
  const kids = useKidsMode();
  const word = byId.get(exercise.wordId);
  const audio = useWordAudio(exercise.wordId, kids);
  const [placed, setPlaced] = useState<number[]>([]);
  const [errors, setErrors] = useState(0);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (wrongId === null) return;
    const timer = setTimeout(() => setWrongId(null), WRONG_FLASH_MS);
    return () => clearTimeout(timer);
  }, [wrongId]);

  const expected = exercise.letters[placed.length];

  function tap(tile: Tile) {
    if (!expected || done) return;
    if (tile.text === expected) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const next = [...placed, tile.id];
      setPlaced(next);
      if (next.length === exercise.letters.length) {
        setDone(true);
        const ok = errors === 0;
        void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
        onAnswer(exercise.wordId, ok, null);
      }
      return;
    }
    setErrors((e) => e + 1);
    setWrongId(tile.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  if (!word) return null;
  const image = kids ? wordImage(word) : null;
  const placedLetters = placed.map((id) => exercise.tiles.find((t) => t.id === id)?.text ?? "");

  return (
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <AppText variant="headline">{kids ? "Compose le mot" : "Composer le mot"}</AppText>
        <Card style={exerciseStyles.prompt}>
          {image ? <ExpoImage source={image} style={styles.image} contentFit="contain" accessibilityLabel={word.fr ?? undefined} /> : null}
          <AppText variant="title" center>
            {word.fr}
          </AppText>
          {audio.url ? <PlayButton playing={audio.playing} onPress={audio.play} /> : null}
          {done ? (
            <ArabicText size={kids ? 44 : 40} center accessibilityLabel={`Mot composé : ${word.ar ?? word.headword ?? ""}`}>
              {word.ar ?? word.headword ?? exercise.letters.join("")}
            </ArabicText>
          ) : (
            <BuiltRow placed={placedLetters} remaining={exercise.letters.length - placed.length} size={kids ? 36 : 32} />
          )}
        </Card>
        <View style={styles.pool}>
          {exercise.tiles.map((tile) => {
            const isPlaced = placed.includes(tile.id);
            return (
              <ExerciseTile
                key={tile.id}
                text={tile.text}
                label={isPlaced ? `Lettre ${tile.text}, déjà placée` : `Lettre ${tile.text}`}
                state={isPlaced ? "placed" : wrongId === tile.id ? "wrong" : "idle"}
                tone={TONES[tile.id % TONES.length]}
                size={kids ? 36 : 32}
                disabled={done}
                onPress={() => tap(tile)}
              />
            );
          })}
        </View>
        {errors > 0 && !done ? (
          <AppText variant="caption" color={colors.accent} center>
            {errorsLabel(errors).replace(/^./, (c) => c.toUpperCase())}
          </AppText>
        ) : null}
      </ScrollView>
      {done ? <Feedback correct={errors === 0} word={word} note={errors > 0 ? `Mot composé avec ${errorsLabel(errors)} : il reviendra.` : undefined} onNext={onNext} loading={submitting} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  image: { width: 140, height: 140 },
  pool: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.md, justifyContent: "center" },
});
