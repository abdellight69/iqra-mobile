import Ionicons from "@expo/vector-icons/Ionicons";
import { memo, type ComponentProps } from "react";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";
import { useIsPlayingVerse, useRecitedWord } from "@/lib/audio";
import { verseTransliteration } from "@/lib/quran-text";
import { tajweedColor } from "@/lib/tajweed";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { Verse, Word } from "@/lib/types";
import { AppText } from "./AppText";
import { ARABIC_MAX_FONT_SCALE } from "./ArabicText";
import { VerseBadge } from "./VerseBadge";

export type VerseCardProps = {
  verse: Verse;
  arabicSize: number;
  showTranslation: boolean;
  showTransliteration: boolean;
  showWordByWord: boolean;
  /** Colore les règles de tajwid (texte balisé fourni par l'API). */
  showTajweed?: boolean;
  /** Positions « verset:mot » des mots reconnus, surlignés quand le mode est actif. */
  knownWords?: Set<string>;
  bookmarked: boolean;
  /**
   * Les actions reçoivent le verset : les fonctions restent les mêmes d'un rendu à l'autre, donc la
   * carte (mémoïsée) ne se re-rend pas quand le lecteur avance. Verset actif et mot récité viennent
   * du lecteur partagé (`useNowPlaying`), auquel chaque carte s'abonne pour sa propre clé.
   */
  onWordPress: (word: Word) => void;
  onPlay: (verse: Verse) => void;
  onBookmark: (verse: Verse) => void;
  onMemorize: (verse: Verse) => void;
  onShare: (verse: Verse) => void;
  onTafsir: (verse: Verse) => void;
  /** Séance sur les mots du livre présents dans ce verset (absent : pas de bouton). */
  onLearn?: (verse: Verse) => void;
};

/** Un verset en pleine largeur : arabe, phonétique, traduction puis actions discrètes. */
function VerseCardBase({
  verse,
  arabicSize,
  showTranslation,
  showTransliteration,
  showWordByWord,
  showTajweed,
  knownWords,
  bookmarked,
  onWordPress,
  onPlay,
  onBookmark,
  onMemorize,
  onShare,
  onTafsir,
  onLearn,
}: VerseCardProps) {
  const colors = useColors();
  const dark = useColorScheme() === "dark";
  const active = useIsPlayingVerse(verse.key);
  const recitedWord = useRecitedWord(verse.key);
  const words = verse.words.filter((w) => w.type === "word");
  const transliteration = showTransliteration ? verseTransliteration(verse) : null;

  return (
    <View style={[styles.verse, active && { backgroundColor: colors.primarySoft }]}>
      <View style={styles.words}>
        {words.map((word) => {
          const known = knownWords?.has(`${verse.verseNumber}:${word.position}`) ?? false;
          const recited = recitedWord === word.position;
          return (
          <Pressable
            key={word.location}
            accessibilityRole="button"
            accessibilityLabel={`${word.textUthmani}${word.translation ? `, ${word.translation}` : ""}${known ? ", mot connu" : ""}`}
            accessibilityHint="Affiche la phonétique, la traduction et l'analyse du mot"
            onPress={() => onWordPress(word)}
            style={({ pressed }) => [
              styles.word,
              known && { backgroundColor: colors.primarySoft },
              (pressed || recited) && { backgroundColor: colors.accentSoft },
            ]}>
            <AppText
              maxFontSizeMultiplier={ARABIC_MAX_FONT_SCALE}
              style={{
                fontFamily: fonts.arabic,
                fontSize: arabicSize,
                lineHeight: Math.round(arabicSize * 1.9),
                color: recited ? colors.accent : known ? colors.primary : colors.arabic,
              }}>
              {showTajweed && word.tajweed
                ? word.tajweed.map((segment, i) => (
                    // Text natif : hérite de la police, de la taille et de la couleur du mot (récité,
                    // connu) ; seuls les segments d'une règle de tajwid prennent leur couleur.
                    <Text key={i} style={{ color: tajweedColor(segment.rule, dark) }}>
                      {segment.text}
                    </Text>
                  ))
                : word.textUthmani}
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
          );
        })}
      </View>

      {transliteration ? (
        <AppText italic color={colors.accent} style={styles.transliteration} accessibilityLabel={`Phonétique : ${transliteration}`}>
          {transliteration}
        </AppText>
      ) : null}

      {showTranslation && verse.translation ? <AppText style={styles.translation}>{verse.translation.text}</AppText> : null}
      {showTranslation && verse.meaning ? (
        <View style={[styles.meaning, { borderLeftColor: colors.accent }]}>
          <AppText variant="caption" color={colors.accent}>
            En bref
          </AppText>
          <AppText muted style={styles.meaningText}>
            {verse.meaning}
          </AppText>
        </View>
      ) : null}

      <View style={styles.footer}>
        <VerseBadge value={verse.verseNumber} size={30} />
        <View style={styles.flex} />
        <Action icon={active ? "pause" : "play-outline"} label={active ? "Mettre en pause" : "Écouter le verset"} onPress={() => onPlay(verse)} active={active} />
        <Action icon={bookmarked ? "bookmark" : "bookmark-outline"} label={bookmarked ? "Retirer le signet" : "Ajouter un signet"} onPress={() => onBookmark(verse)} active={bookmarked} />
        <Action icon="reader-outline" label="Tafsir de ce verset" onPress={() => onTafsir(verse)} />
        {onLearn ? <Action icon="sparkles-outline" label="Apprendre les mots de ce verset" onPress={() => onLearn(verse)} /> : null}
        <Action icon="repeat-outline" label="Mémoriser ce verset" onPress={() => onMemorize(verse)} />
        <Action icon="share-outline" label="Partager ce verset en image" onPress={() => onShare(verse)} />
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
      accessibilityState={active === undefined ? undefined : { selected: active }}
      hitSlop={4}
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
  meaning: { borderLeftWidth: 2, paddingLeft: spacing.md, gap: 2 },
  meaningText: { fontSize: 15, lineHeight: 23 },
  footer: { flexDirection: "row", alignItems: "center", gap: 0, marginTop: spacing.xs },
  action: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
