import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { useOneShot } from "@/lib/audio";
import { openWordSheet } from "@/lib/navigation";
import { useWordExample } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import { transliterate } from "@/lib/transliterate";
import { AppText } from "./AppText";
import { ArabicText } from "./ArabicText";

/**
 * Le mot du lexique dans le Coran : première occurrence trouvée via le Quranic Arabic Corpus,
 * avec la phonétique et l'audio de Quran.com. Rien n'est affiché si le rapprochement n'est pas certain.
 */
export function QuranExample({ wordId, compact = false }: { wordId: string; compact?: boolean }) {
  const colors = useColors();
  const example = useWordExample(wordId);
  const audio = useOneShot();
  const data = example.data;
  if (!data) return null;
  const { word, verseKey } = data;
  // Phonétique de Quran.com, sinon la nôtre : le mot n'est jamais montré en arabe seul.
  const phonetic = word.transliteration ?? transliterate(word.textUthmani);

  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Dans le Coran, verset ${verseKey} : ${word.textUthmani}, ${phonetic}${word.translation ? `, ${word.translation}` : ""}. Écouter`}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        onPress={() => (word.audioUrl ? audio.play(word.audioUrl) : openWordSheet(word))}
        onLongPress={() => openWordSheet(word)}
        style={({ pressed }) => [styles.compact, { opacity: pressed ? 0.6 : 1 }]}>
        <Ionicons name={audio.playing ? "volume-high" : "volume-medium-outline"} size={15} color={colors.accent} />
        <View style={styles.compactText}>
          <View style={styles.compactLine}>
            <ArabicText size={18} style={styles.compactArabic}>
              {word.textUthmani}
            </ArabicText>
            <AppText variant="caption" italic color={colors.accent} numberOfLines={1} style={styles.shrink}>
              {phonetic}
            </AppText>
          </View>
          <AppText variant="caption" muted numberOfLines={1}>
            {word.translation ? `${word.translation} · ` : ""}
            <AppText variant="caption" faint>
              {verseKey}
            </AppText>
          </AppText>
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Dans le Coran, verset ${verseKey} : ${word.textUthmani}, ${phonetic}${word.translation ? `, ${word.translation}` : ""}`}
      accessibilityHint="Ouvre l'analyse du mot"
      onPress={() => openWordSheet(word)}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}>
      {word.audioUrl ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Écouter le mot"
          hitSlop={8}
          onPress={() => audio.play(word.audioUrl!)}
          style={[styles.play, { backgroundColor: colors.primary }]}>
          <Ionicons name={audio.playing ? "volume-high" : "play"} size={18} color={colors.onPrimary} />
        </Pressable>
      ) : null}
      <View style={styles.flex}>
        <AppText variant="label" muted>
          Dans le Coran · {verseKey}
        </AppText>
        <AppText italic color={colors.accent} style={styles.translit}>
          {phonetic}
        </AppText>
        <AppText variant="caption" muted numberOfLines={2}>
          {word.translation ?? "Traduction indisponible"}
        </AppText>
      </View>
      <ArabicText size={28}>{word.textUthmani}</ArabicText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  card: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.md, borderRadius: radius.lg },
  play: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  translit: { fontSize: 18, lineHeight: 24 },
  compact: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch" },
  compactText: { flex: 1 },
  compactLine: { flexDirection: "row", alignItems: "center", gap: 8 },
  compactArabic: { lineHeight: 28 },
  shrink: { flexShrink: 1 },
});
