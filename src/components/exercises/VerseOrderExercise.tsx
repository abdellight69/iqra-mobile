import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useOneShot } from "@/lib/audio";
import { KID_TONES, type KidTone, useKidsColors, useKidsMode } from "@/lib/kids";
import { radius, spacing, useColors } from "@/lib/theme";
import { errorsLabel, type ExerciseWord, orderTiles, segmentWords, SLOT, type Tile } from "@/lib/verse-exercises";
import { AppText } from "../AppText";
import { ArabicText } from "../ArabicText";
import { Button } from "../Button";
import { Card } from "../Card";
import { BigButton } from "../kids/KidButton";
import { exerciseStyles } from "./shared";

/** Teintes des tuiles d'un enfant, en tournant selon la position d'origine. */
const TONES: KidTone[] = ["blue", "green", "orange", "violet", "pink", "sun"];
/** Durée pendant laquelle une tuile fausse reste rouge avant de « revenir ». */
const WRONG_FLASH_MS = 450;

export type TileState = "idle" | "wrong" | "right" | "placed";

/**
 * Tuile à toucher (mot ou lettre), partagée par les trois exercices de recomposition : cible
 * d'au moins 44 pt, rôle et libellé d'accessibilité, couleur selon l'état. Enfant : plus grande,
 * teinte franche de la charte « Ciel » (pastel en fond, bord de la teinte).
 */
export function ExerciseTile({ text, label, state, tone = "blue", size, disabled, onPress }: { text: string; label: string; state: TileState; tone?: KidTone; size?: number; disabled?: boolean; onPress: () => void }) {
  const colors = useColors();
  const kids = useKidsMode();
  const kc = useKidsColors();
  const tint = kc.tint(tone);
  const palette =
    state === "wrong"
      ? { bg: colors.dangerSoft, border: colors.danger, ink: colors.danger }
      : state === "right"
        ? { bg: colors.successSoft, border: colors.success, ink: colors.success }
        : kids
          ? { bg: tint.bg, border: KID_TONES[tone].edge, ink: tint.ink }
          : { bg: colors.surface, border: colors.border, ink: colors.arabic };
  const placed = state === "placed";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || placed }}
      disabled={disabled || placed}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tile,
        kids && styles.tileKids,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: placed ? 0.25 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
      ]}>
      <ArabicText size={size ?? (kids ? 34 : 28)} color={palette.ink} center accessible={false}>
        {text}
      </ArabicText>
    </Pressable>
  );
}

/** Rangée de droite à gauche où le texte se construit : mots placés, puis la case en cours, puis les cases à venir. */
export function BuiltRow({ placed, remaining, size }: { placed: string[]; remaining: number; size?: number }) {
  const colors = useColors();
  const kids = useKidsMode();
  const fontSize = size ?? (kids ? 32 : 28);
  return (
    <View style={styles.row} accessibilityLabel={placed.length > 0 ? `Déjà placé : ${placed.join(" ")}` : "Rien n'est encore placé"}>
      {placed.map((text, i) => (
        <ArabicText key={`${i}-${text}`} size={fontSize} color={colors.success} accessible={false}>
          {text}
        </ArabicText>
      ))}
      {Array.from({ length: remaining }, (_, i) => (
        <View key={`slot-${i}`} style={[styles.slot, { borderColor: i === 0 ? colors.accent : colors.border, backgroundColor: i === 0 ? colors.accentSoft : colors.surfaceMuted }]} accessible={false}>
          <ArabicText size={fontSize} color={i === 0 ? colors.accent : colors.textFaint} center accessible={false}>
            {SLOT}
          </ArabicText>
        </View>
      ))}
    </View>
  );
}

/** Bandeau de fin d'un exercice de recomposition : verdict, nombre d'erreurs, bouton pour continuer. */
export function DrillSummary({ title, errors, onNext }: { title: string; errors: number; onNext: () => void }) {
  const colors = useColors();
  const kids = useKidsMode();
  const clean = errors === 0;
  const tone = clean ? colors.success : colors.accent;
  return (
    <View style={[styles.summary, { backgroundColor: clean ? colors.successSoft : colors.accentSoft }]} accessibilityLiveRegion="polite">
      <View style={styles.summaryRow}>
        <Ionicons name={clean ? "checkmark-circle" : "information-circle"} size={26} color={tone} />
        <AppText variant="headline" color={tone}>
          {title}
        </AppText>
      </View>
      <AppText variant="bodyStrong" muted>
        {clean ? (kids ? "Sans aucune erreur, bravo !" : "Sans erreur.") : `${errorsLabel(errors).replace(/^./, (c) => c.toUpperCase())} en route : ${kids ? "tu y arriveras encore mieux la prochaine fois." : "ce verset mérite encore une écoute."}`}
      </AppText>
      {kids ? <BigButton title="Continuer" icon="arrow-forward" onPress={onNext} /> : <Button title="Continuer" onPress={onNext} />}
    </View>
  );
}

/** Bouton discret pour sauter un exercice facultatif. */
export function SkipButton({ onPress }: { onPress: () => void }) {
  return <Button title="Passer" variant="ghost" size="md" onPress={onPress} />;
}

export type VerseOrderExerciseProps = {
  /** Mots du verset (déjà filtrés : `type === "word"`), dans l'ordre. */
  words: ExerciseWord[];
  /** Appelé quand le verset est recomposé, avec le nombre d'erreurs. */
  onDone: (errors: number) => void;
  /** Présent : l'exercice peut être sauté. */
  onSkip?: () => void;
};

/**
 * « Recomposer le verset » : les mots mélangés en tuiles, à toucher dans l'ordre pour rebâtir le
 * verset de droite à gauche. Une tuile fausse vibre, rougit et revient ; on compte les erreurs.
 * Un verset de plus de 12 mots est travaillé en parties, avec « Suite » entre elles. Enfant :
 * grandes tuiles colorées et le mot récité (Quran.com) à chaque bonne tuile.
 */
export function VerseOrderExercise({ words, onDone, onSkip }: VerseOrderExerciseProps) {
  const colors = useColors();
  const kids = useKidsMode();
  const audio = useOneShot();
  const segments = useMemo(() => segmentWords(words), [words]);
  // Mélange tiré une fois à l'ouverture : les tuiles ne bougent pas pendant qu'on joue.
  const [tilesBySegment] = useState(() => segments.map((segment) => orderTiles(segment.map((w) => w.textUthmani))));
  const [segment, setSegment] = useState(0);
  const [placed, setPlaced] = useState<number[]>([]);
  const [errors, setErrors] = useState(0);
  const [wrongId, setWrongId] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (wrongId === null) return;
    const timer = setTimeout(() => setWrongId(null), WRONG_FLASH_MS);
    return () => clearTimeout(timer);
  }, [wrongId]);

  const current = segments[segment] ?? [];
  const tiles = tilesBySegment[segment] ?? [];
  const expected = current[placed.length];
  const segmentDone = placed.length === current.length && current.length > 0;

  function tap(tile: Tile) {
    if (!expected || finished || segmentDone) return;
    if (tile.text === expected.textUthmani) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (kids && expected.audioUrl) audio.play(expected.audioUrl);
      const next = [...placed, tile.id];
      setPlaced(next);
      if (next.length === current.length && segment === segments.length - 1) {
        setFinished(true);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return;
    }
    setErrors((e) => e + 1);
    setWrongId(tile.id);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }

  if (words.length < 2) return null;
  const placedTexts = placed.map((id) => tiles.find((t) => t.id === id)?.text ?? "");

  return (
    <View style={exerciseStyles.body}>
      <ScrollView contentContainerStyle={exerciseStyles.scroll}>
        <View style={styles.heading}>
          <AppText variant="headline">{kids ? "Recompose le verset" : "Recomposer le verset"}</AppText>
          <AppText variant="caption" muted>
            {kids ? "Touche les mots dans l'ordre, en commençant à droite." : "Touchez les mots dans l'ordre de récitation, de droite à gauche."}
            {segments.length > 1 ? ` Partie ${segment + 1} sur ${segments.length}.` : ""}
          </AppText>
        </View>
        <Card style={styles.card}>
          <BuiltRow placed={placedTexts} remaining={current.length - placed.length} />
        </Card>
        <View style={styles.pool}>
          {tiles.map((tile) => {
            const isPlaced = placed.includes(tile.id);
            return (
              <ExerciseTile
                key={tile.id}
                text={tile.text}
                label={isPlaced ? `${tile.text}, déjà placé` : `Mot ${tile.text}`}
                state={isPlaced ? "placed" : wrongId === tile.id ? "wrong" : "idle"}
                tone={TONES[tile.id % TONES.length]}
                disabled={finished || segmentDone}
                onPress={() => tap(tile)}
              />
            );
          })}
        </View>
        {errors > 0 && !finished ? (
          <AppText variant="caption" color={colors.accent} center>
            {errorsLabel(errors).replace(/^./, (c) => c.toUpperCase())}
          </AppText>
        ) : null}
      </ScrollView>
      {finished ? (
        <DrillSummary title={kids ? "Verset recomposé !" : "Verset recomposé"} errors={errors} onNext={() => onDone(errors)} />
      ) : segmentDone ? (
        kids ? (
          <BigButton
            title="Suite"
            icon="arrow-forward"
            onPress={() => {
              setSegment((s) => s + 1);
              setPlaced([]);
            }}
          />
        ) : (
          <Button
            title="Suite"
            icon="arrow-forward"
            onPress={() => {
              setSegment((s) => s + 1);
              setPlaced([]);
            }}
          />
        )
      ) : onSkip ? (
        <SkipButton onPress={onSkip} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xs },
  card: { gap: spacing.md },
  row: { flexDirection: "row-reverse", flexWrap: "wrap", alignItems: "center", columnGap: spacing.sm, rowGap: spacing.xs, minHeight: 56 },
  slot: { minWidth: 48, minHeight: 44, borderRadius: radius.sm, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.xs },
  pool: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
  tile: { minHeight: 52, minWidth: 52, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1.5, alignItems: "center", justifyContent: "center" },
  tileKids: { minHeight: 64, minWidth: 64, paddingHorizontal: spacing.lg, borderRadius: radius.lg, borderWidth: 3 },
  summary: { margin: -spacing.lg, marginTop: 0, padding: spacing.xl, gap: spacing.md, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl },
  summaryRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
