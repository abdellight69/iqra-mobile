import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useRef, type ReactNode } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useOneShot } from "@/lib/audio";
import type { SessionExercise } from "@/lib/exercises";
import { useWordExample } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import { transliterate } from "@/lib/transliterate";
import type { VocabWord } from "@/lib/types";
import { AppText } from "../AppText";
import { ArabicText } from "../ArabicText";
import { Button } from "../Button";

export type ExerciseProps<E extends SessionExercise = SessionExercise> = {
  exercise: E;
  byId: Map<string, VocabWord>;
  /** Réponse enregistrée pour le mot ; `retry` : exercice à reposer en fin de séance si raté. */
  onAnswer: (wordId: string, correct: boolean, retry: SessionExercise | null) => void;
  onNext: () => void;
  submitting: boolean;
};

/** Phonétique d'un texte arabe, en italique doré, comme la translittération du lecteur. */
export function Phonetic({ text, size = 15, center, numberOfLines }: { text: string; size?: number; center?: boolean; numberOfLines?: number }) {
  const colors = useColors();
  return (
    <AppText
      italic
      color={colors.accent}
      center={center}
      numberOfLines={numberOfLines}
      style={{ fontSize: size, lineHeight: Math.round(size * 1.4) }}
      accessibilityLabel={`Phonétique : ${text}`}>
      {text}
    </AppText>
  );
}

/** Le mot complet : arabe, phonétique et sens. Rien n'est montré dans une seule langue. */
export function WordSummary({ word, size = 40, showMeaning = true, style }: { word: VocabWord; size?: number; showMeaning?: boolean; style?: StyleProp<ViewStyle> }) {
  const arabic = word.headword ?? word.ar;
  return (
    <View style={[styles.summary, style]}>
      {arabic ? (
        <>
          <ArabicText size={size} center>
            {arabic}
          </ArabicText>
          <Phonetic text={transliterate(arabic)} size={Math.max(15, Math.round(size * 0.42))} center />
        </>
      ) : null}
      {showMeaning && word.fr ? (
        <AppText variant={size >= 36 ? "title" : "bodyStrong"} center>
          {word.fr}
        </AppText>
      ) : null}
    </View>
  );
}

/** Proposition d'un choix multiple : couleur selon l'état après réponse. */
export function ChoiceButton({
  state,
  disabled,
  onPress,
  children,
  label,
}: {
  state: "idle" | "right" | "wrong";
  disabled?: boolean;
  onPress: () => void;
  children: ReactNode;
  label?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        {
          backgroundColor: state === "right" ? colors.successSoft : state === "wrong" ? colors.dangerSoft : colors.surface,
          borderColor: state === "right" ? colors.success : state === "wrong" ? colors.danger : colors.border,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}>
      {children}
    </Pressable>
  );
}

/** Choix écrit en arabe : forme et phonétique ensemble. */
export function ArabicChoice({ text }: { text: string }) {
  return (
    <View style={styles.arabicChoice}>
      <ArabicText size={26} center>
        {text}
      </ArabicText>
      <Phonetic text={transliterate(text)} size={13} center numberOfLines={1} />
    </View>
  );
}

/**
 * Retour après réponse : verdict, mot complet si raté, bouton pour continuer.
 * `hint` : bonne réponse trouvée après avoir révélé l'aide (ton neutre, le mot est déjà visible).
 */
export function Feedback({ correct, hint, word, note, onNext, loading }: { correct: boolean; hint?: boolean; word?: VocabWord; note?: string; onNext: () => void; loading: boolean }) {
  const colors = useColors();
  const tone = hint ? colors.accent : correct ? colors.success : colors.danger;
  const background = hint ? colors.accentSoft : correct ? colors.successSoft : colors.dangerSoft;
  return (
    <View style={[styles.feedback, { backgroundColor: background }]}>
      <View style={styles.feedbackRow}>
        <Ionicons name={hint ? "eye" : correct ? "checkmark-circle" : "close-circle"} size={26} color={tone} />
        <AppText variant="headline" color={tone}>
          {hint ? "Trouvé avec l'indice" : correct ? "Excellent !" : "Pas tout à fait"}
        </AppText>
      </View>
      {!correct && !hint && word ? <WordSummary word={word} size={30} style={styles.feedbackWord} /> : null}
      {note ? (
        <AppText variant="caption" muted>
          {note}
        </AppText>
      ) : null}
      <Button title="Continuer" onPress={onNext} loading={loading} />
    </View>
  );
}

/** Petit bouton « voir » qui révèle l'aide (phonétique et sens). */
export function RevealButton({ revealed, onPress }: { revealed: boolean; onPress: () => void }) {
  const colors = useColors();
  if (revealed) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Voir la phonétique et le sens"
      accessibilityHint="La réponse comptera alors comme à revoir"
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.reveal, { borderColor: colors.border, backgroundColor: pressed ? colors.surfaceMuted : "transparent" }]}>
      <Ionicons name="eye-outline" size={15} color={colors.textMuted} />
      <AppText variant="caption" muted>
        voir
      </AppText>
    </Pressable>
  );
}

/**
 * Audio du mot tel qu'il est récité dans le Coran (Quran.com, via l'exemple du mot).
 * `ready` : la recherche est terminée ; `url` null si aucun enregistrement n'est disponible.
 */
export function useWordAudio(wordId: string, autoplay = true) {
  const example = useWordExample(wordId);
  const audio = useOneShot();
  const url = example.data?.word.audioUrl ?? null;
  const played = useRef(false);
  const play = audio.play;
  useEffect(() => {
    if (!autoplay || !url || played.current) return;
    played.current = true;
    play(url);
  }, [url, autoplay, play]);
  return {
    url,
    ready: !example.isPending,
    playing: audio.playing,
    example: example.data ?? null,
    play: () => {
      if (url) play(url);
    },
  };
}

/**
 * Bouton « Écouter » d'une carte mot : le mot récité dans le Coran (Quran.com). Rien si aucun
 * enregistrement n'existe pour ce mot (pas de voix de synthèse, volontairement).
 */
export function ListenButton({ wordId }: { wordId: string }) {
  const colors = useColors();
  const audio = useWordAudio(wordId, false);
  if (!audio.url) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Écouter le mot récité"
      onPress={audio.play}
      style={({ pressed }) => [styles.listen, { backgroundColor: audio.playing ? colors.primarySoft : colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name={audio.playing ? "volume-high" : "play"} size={18} color={colors.primary} />
      <AppText variant="bodyStrong" color={colors.primary}>
        Écouter
      </AppText>
    </Pressable>
  );
}

/** Gros bouton rond de lecture, au centre de la carte d'écoute. */
export function PlayButton({ playing, disabled, onPress }: { playing: boolean; disabled?: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? "Lecture en cours" : "Écouter le mot"}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.play, { backgroundColor: disabled ? colors.surfaceMuted : colors.primary, transform: [{ scale: pressed ? 0.94 : 1 }] }]}>
      <Ionicons name={playing ? "volume-high" : "play"} size={34} color={disabled ? colors.textFaint : colors.onPrimary} style={playing ? undefined : { marginLeft: 4 }} />
    </Pressable>
  );
}

export const exerciseStyles = StyleSheet.create({
  body: { flex: 1, padding: spacing.lg, gap: spacing.lg },
  scroll: { gap: spacing.lg, paddingBottom: spacing.lg },
  prompt: { paddingVertical: spacing.xl, alignItems: "center", gap: spacing.sm },
  choices: { gap: spacing.md },
  row: { flexDirection: "row", gap: spacing.md },
});

const styles = StyleSheet.create({
  summary: { alignItems: "center", gap: spacing.xs },
  choice: { borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.lg, minHeight: 60, justifyContent: "center" },
  arabicChoice: { alignItems: "center", gap: 2 },
  feedback: { margin: -spacing.lg, marginTop: 0, padding: spacing.xl, gap: spacing.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  feedbackRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  feedbackWord: { alignItems: "flex-start" },
  reveal: { flexDirection: "row", alignItems: "center", gap: spacing.xs, alignSelf: "center", paddingHorizontal: spacing.md, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, minHeight: 32 },
  play: { width: 88, height: 88, borderRadius: 44, alignItems: "center", justifyContent: "center" },
  listen: { flexDirection: "row", alignItems: "center", gap: spacing.sm, alignSelf: "center", paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, minHeight: 44, borderRadius: radius.pill },
});
