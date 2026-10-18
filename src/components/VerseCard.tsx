import Ionicons from "@expo/vector-icons/Ionicons";
import { memo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { Verse, Word } from "@/lib/types";
import { AppText } from "./AppText";
import { VerseBadge } from "./VerseBadge";

export type VerseCardProps = {
  verse: Verse;
  arabicSize: number;
  showTranslation: boolean;
  showWordByWord: boolean;
  active: boolean;
  bookmarked: boolean;
  onWordPress: (word: Word) => void;
  onPlay: () => void;
  onBookmark: () => void;
  onMemorize: () => void;
};

function VerseCardBase({
  verse,
  arabicSize,
  showTranslation,
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

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: active ? colors.primarySoft : colors.surface, borderColor: active ? colors.primary : colors.border },
      ]}>
      <View style={styles.toolbar}>
        <VerseBadge value={verse.verseNumber} />
        <View style={styles.actions}>
          <IconAction icon={active ? "pause-circle" : "play-circle-outline"} label="Écouter le verset" onPress={onPlay} />
          <IconAction icon={bookmarked ? "bookmark" : "bookmark-outline"} label="Signet" onPress={onBookmark} />
          <IconAction icon="repeat" label="Mémoriser ce verset" onPress={onMemorize} />
        </View>
      </View>

      <View style={styles.words}>
        {words.map((word) => (
          <Pressable
            key={word.location}
            accessibilityRole="button"
            accessibilityLabel={`${word.textUthmani}${word.translation ? `, ${word.translation}` : ""}`}
            accessibilityHint="Affiche la phonétique, la traduction et l'analyse du mot"
            onPress={() => onWordPress(word)}
            style={({ pressed }) => [styles.word, pressed && { backgroundColor: colors.accentSoft }]}>
            <AppText
              style={{ fontFamily: fonts.arabic, fontSize: arabicSize, lineHeight: Math.round(arabicSize * 1.85), color: colors.arabic }}>
              {word.textUthmani}
            </AppText>
            {showWordByWord ? (
              <View style={styles.wbw}>
                {word.transliteration ? (
                  <AppText variant="caption" color={colors.primary} numberOfLines={1}>
                    {word.transliteration}
                  </AppText>
                ) : null}
                {word.translation ? (
                  <AppText variant="caption" muted numberOfLines={2} center>
                    {word.translation}
                  </AppText>
                ) : null}
              </View>
            ) : null}
          </Pressable>
        ))}
      </View>

      {showTranslation && verse.translation ? (
        <View style={[styles.translation, { borderTopColor: colors.border }]}>
          <AppText>{verse.translation.text}</AppText>
          {verse.translation.resourceName ? (
            <AppText variant="caption" muted>
              — {verse.translation.resourceName}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function IconAction({ icon, label, onPress }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} style={styles.iconAction}>
      <Ionicons name={icon} size={24} color={colors.primary} />
    </Pressable>
  );
}

export const VerseCard = memo(VerseCardBase);

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  toolbar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  actions: { flexDirection: "row", gap: spacing.sm },
  iconAction: { padding: spacing.xs },
  words: { flexDirection: "row-reverse", flexWrap: "wrap", columnGap: spacing.sm, rowGap: spacing.xs },
  word: { alignItems: "center", borderRadius: radius.sm, paddingHorizontal: 2, maxWidth: "100%" },
  wbw: { alignItems: "center", maxWidth: 110, marginTop: -spacing.sm },
  translation: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.md, gap: spacing.xs },
});
