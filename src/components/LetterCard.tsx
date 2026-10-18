import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { useOneShot } from "@/lib/audio";
import { radius, spacing, useColors } from "@/lib/theme";
import type { AlphabetLetter, ReadingWord } from "@/lib/types";
import { AppText } from "./AppText";
import { ArabicText } from "./ArabicText";
import { Card } from "./Card";
import { HighlightedArabic } from "./HighlightedArabic";

const FORM_LABELS = [
  { key: "isolated", label: "Isolée" },
  { key: "initial", label: "Début" },
  { key: "medial", label: "Milieu" },
  { key: "final", label: "Fin" },
] as const;

/** Fiche d'une lettre : tracé, nom, son, formes selon la position, et un mot du Coran. */
export function LetterCard({ letter, example }: { letter: AlphabetLetter; example: ReadingWord | null }) {
  const colors = useColors();
  const audio = useOneShot();
  const word = example ?? { ...letter.example, audioUrl: null };

  return (
    <View style={styles.wrap}>
      <Card style={styles.hero}>
        <ArabicText size={96} center color={colors.primary} style={styles.glyph}>
          {letter.char}
        </ArabicText>
        <View style={styles.names}>
          <AppText variant="title">{letter.name}</AppText>
          <ArabicText size={24}>{letter.nameArabic}</ArabicText>
        </View>
        <View style={[styles.pill, { backgroundColor: colors.primarySoft }]}>
          <AppText variant="bodyStrong" color={colors.primary}>
            {letter.translit}
          </AppText>
        </View>
        <AppText muted center>
          {letter.sound}
        </AppText>
      </Card>

      <View style={styles.forms}>
        {/* De droite à gauche, comme on lit : isolée, début, milieu, fin. */}
        {FORM_LABELS.map(({ key, label }) => {
          const form = letter.forms[key];
          return (
            <View key={key} style={[styles.form, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <ArabicText size={34} center color={form ? colors.arabic : colors.textFaint} style={styles.formGlyph}>
                {form ?? "—"}
              </ArabicText>
              <AppText variant="caption" muted center>
                {label}
              </AppText>
            </View>
          );
        })}
      </View>
      {!letter.joins && letter.forms.initial ? (
        <AppText variant="caption" muted center>
          Cette lettre ne s’attache pas à la lettre qui la suit.
        </AppText>
      ) : null}

      <Card style={styles.example}>
        <AppText variant="label" muted>
          Dans le Coran · {word.location.split(":").slice(0, 2).join(":")}
        </AppText>
        <View style={styles.exampleRow}>
          {word.audioUrl ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Écouter le mot"
              onPress={() => audio.play(word.audioUrl!)}
              style={[styles.play, { backgroundColor: colors.primary }]}>
              <Ionicons name={audio.playing ? "volume-high" : "play"} size={20} color={colors.onPrimary} />
            </Pressable>
          ) : null}
          <View style={styles.flex}>
            <HighlightedArabic text={word.text} highlight={[letter.char, ...letter.variants]} size={40} />
            <AppText italic color={colors.accent} style={styles.reading}>
              {word.reading}
            </AppText>
          </View>
        </View>
        {letter.note ? (
          <AppText variant="caption" muted>
            {letter.note}
          </AppText>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: spacing.md },
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  glyph: { lineHeight: 150, paddingBottom: spacing.xxl },
  names: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  pill: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 4 },
  forms: { flexDirection: "row-reverse", gap: spacing.sm },
  formGlyph: { lineHeight: 70, paddingBottom: 12 },
  form: { flex: 1, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: "center" },
  example: { gap: spacing.sm },
  exampleRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  reading: { textAlign: "right" },
});
