import * as Haptics from "expo-haptics";
import { useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import type { GameExercise } from "@/lib/exercises";
import { useColors } from "@/lib/theme";
import { AppText } from "../AppText";
import { Card } from "../Card";
import { ArabicChoice, ChoiceButton, exerciseStyles, type ExerciseProps, Feedback, PlayButton, RevealButton, useWordAudio, WordSummary } from "./shared";

type Listen = Extract<GameExercise, { type: "listen" | "listen_ar" }>;

/**
 * On entend le mot récité (audio Quran.com), sans phonétique ni sens : on choisit son sens
 * (`listen`) ou sa forme écrite (`listen_ar`). « voir » révèle l'aide ; la réponse compte alors
 * comme à revoir. Sans enregistrement disponible, la carte montre ce que l'audio aurait dit.
 */
export function ListenExercise({ exercise, byId, onAnswer, onNext, submitting }: ExerciseProps<Listen>) {
  const colors = useColors();
  const word = byId.get(exercise.wordId);
  const audio = useWordAudio(exercise.wordId);
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const meaning = exercise.type === "listen";
  const noAudio = audio.ready && !audio.url;
  const correct = picked === exercise.answerId;

  function pick(id: string) {
    if (picked) return;
    setPicked(id);
    const ok = id === exercise.answerId && !revealed;
    void Haptics.notificationAsync(ok ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
    onAnswer(exercise.wordId, ok, ok ? null : { ...exercise, choices: [...exercise.choices].reverse() });
  }

  if (!word) return null;

  return (
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <AppText variant="headline">
          {noAudio ? (meaning ? "Que signifie ce mot ?" : "Comment dit-on en arabe ?") : meaning ? "Écoutez, puis choisissez le sens" : "Écoutez, puis choisissez le mot"}
        </AppText>
        <Card style={exerciseStyles.prompt}>
          {!audio.ready ? (
            <ActivityIndicator color={colors.primary} />
          ) : noAudio ? (
            // Pas d'enregistrement pour ce mot : on montre l'indice que l'audio aurait donné.
            meaning ? (
              <WordSummary word={word} showMeaning={false} />
            ) : (
              <AppText variant="title" center>
                {word.fr}
              </AppText>
            )
          ) : (
            <>
              <PlayButton playing={audio.playing} onPress={audio.play} />
              <AppText variant="caption" muted>
                Touchez pour réécouter
              </AppText>
            </>
          )}
          {revealed ? <WordSummary word={word} size={32} /> : null}
          {!noAudio && audio.ready && !picked ? <RevealButton revealed={revealed} onPress={() => setRevealed(true)} /> : null}
          {revealed && !picked ? (
            <AppText variant="caption" muted center>
              Indice utilisé : ce mot reviendra en révision.
            </AppText>
          ) : null}
        </Card>
        <View style={exerciseStyles.choices}>
          {exercise.choices.map((choice) => {
            const isAnswer = choice.id === exercise.answerId;
            const state = !picked ? "idle" : isAnswer ? "right" : choice.id === picked ? "wrong" : "idle";
            return (
              <ChoiceButton key={choice.id} state={state} disabled={Boolean(picked) || !audio.ready} onPress={() => pick(choice.id)} label={meaning ? choice.text : undefined}>
                {meaning ? (
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
      {picked ? (
        <Feedback
          correct={correct && !revealed}
          hint={correct && revealed}
          word={word}
          note={correct && revealed ? "La réponse compte comme à revoir : le mot reviendra en révision." : undefined}
          onNext={onNext}
          loading={submitting}
        />
      ) : null}
    </View>
  );
}
