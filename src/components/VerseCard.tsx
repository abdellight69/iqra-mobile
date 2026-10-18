import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, type ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { verseTransliteration } from "@/lib/quran-text";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { Verse, Word } from "@/lib/types";
import { AppText } from "./AppText";
import { VerseBadge } from "./VerseBadge";

export type VerseCardProps = {
  verse: Verse;
  arabicSize: number;
  showTranslation: boolean;
  showTransliteration: boolean;
  showWordByWord: boolean;
  active: boolean;
  bookmarked: boolean;
  onWordPress: (word: Word) => void;
  onPlay: () => void;
  onBookmark: () => void;
  onMemorize: () => void;
};

/** Un verset en pleine largeur : arabe, phonétique, traduction puis actions discrètes. */
function VerseCardBase({
  verse,
  arabicSize,
  showTranslation,
  showTransliteration,
  showWordByWord,
  active,
  bookmarked,
  onWordPress,
  onPlay,
  onBookmark,
  onMemorize,
}: VerseCardProps) {
  const colors = useColors();
  const words = verse.words.filter((w) => w.type === "word");
  const transliteration = showTransliteration ? verseTransliteration(verse) : null;

  return (
    <View style={[styles.verse, active && { backgroundColor: colors.primarySoft }]}>
      <View style={styles.words}>
        {words.map((word) => (
          <Pressable
            key={word.location}
            accessibilityRole="button"
            accessibilityLabel={`${word.textUthmani}${word.translation ? `, ${word.translation}` : ""}`}
            accessibilityHint="Affiche la phonétique, la traduction et l'analyse du mot"
            onPress={() => onWordPress(word)}
            style={({ pressed }) => [styles.word, pressed && { backgroundColor: colors.accentSoft }]}>
            <AppText style={{ fontFamily: fonts.arabic, fontSize: arabicSize, lineHeight: Math.round(arabicSize * 1.9), color: colors.arabic }}>
              {word.textUthmani}
            </AppText>
            {showWordByWord ? (
              <View style={styles.wbw}>
                {word.transliteration ? (
                  <AppText variant="caption" color={colors.accent} numberOfLines={1} italic style={styles.translit}>
                    {word.transliteration}
                  </AppText>
                ) : null}
                {word.translation ? (
                  <AppText variant="caption" muted numberOfLines={2} center style={styles.wbwText}>
                    {word.translation}
                  </AppText>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {transliteration ? (
        <AppText italic color={colors.accent} style={styles.transliteration} accessibilityLabel={`Phonétique : ${transliteration}`}>
          {transliteration}
        </AppText>
      ) : null}

      {showTranslation && verse.translation ? <AppText style={styles.translation}>{verse.translation.text}</AppText> : null}

      <View style={styles.footer}>
        <VerseBadge value={verse.verseNumber} size={30} />
        <View style={styles.flex} />
        <Action icon={active ? "pause" : "play-outline"} label="Écouter le verset" onPress={onPlay} active={active} />
        <Action icon={bookmarked ? "bookmark" : "bookmark-outline"} label="Signet" onPress={onBookmark} active={bookmarked} />
        <Action icon="repeat-outline" label="Mémoriser ce verset" onPress={onMemorize} />
      </View>
    </View>
  );
}

function Action({ icon, label, onPress, active }: { icon: ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void; active?: boolean }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [styles.action, { opacity: pressed ? 0.5 : 1 }]}>
      <Ionicons name={icon} size={19} color={active ? colors.primary : colors.textMuted} />
    </Pressable>
  );
}

export const VerseCard = memo(VerseCardBase);

const styles = StyleSheet.create({
  flex: { flex: 1 },
  verse: { paddingVertical: spacing.xl, paddingHorizontal: spacing.md, gap: spacing.md, borderRadius: radius.lg },
  words: { flexDirection: "row-reverse", flexWrap: "wrap", columnGap: spacing.sm, rowGap: 2 },
  word: { alignItems: "center", borderRadius: radius.sm, paddingHorizontal: 2, maxWidth: "100%" },
  wbw: { alignItems: "center", maxWidth: 110, marginTop: -spacing.md, gap: 1 },
  translit: { fontSize: 14 },
  wbwText: { fontSize: 12, lineHeight: 15 },
  transliteration: { fontSize: 15, lineHeight: 23 },
  translation: { fontSize: 16, lineHeight: 26 },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.xs, marginTop: spacing.xs },
  action: { width: 38, height: 38, alignItems: "center", justifyContent: "center" },
});
