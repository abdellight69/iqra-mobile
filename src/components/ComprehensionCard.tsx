import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Fragment } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useChapterComprehension } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";
import { ArabicText } from "./ArabicText";

const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

/**
 * Part des mots de la sourate que l'on reconnaît grâce aux leçons, et les quelques mots
 * du livre qui en feraient reconnaître le plus.
 */
export function ComprehensionCard({ chapterId }: { chapterId: number }) {
  const colors = useColors();
  const comprehension = useChapterComprehension(chapterId);
  const data = comprehension.data;
  if (!data || data.totalWords === 0) return null;

  const known = percent(data.knownWords, data.totalWords);
  const book = percent(data.coveredByBook, data.totalWords);

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.headline}>
        <AppText variant="display" color={colors.primary}>
          {known} %
        </AppText>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{data.knownWords > 0 ? "des mots reconnus" : "Aucun mot appris pour l’instant"}</AppText>
          <AppText variant="caption" muted>
            {data.knownWords} sur {data.totalWords} mots · le livre en couvre {book} %
          </AppText>
        </View>
      </View>

      <View
        accessibilityRole="progressbar"
        accessibilityLabel={`${known}\u00A0% reconnus, ${book}\u00A0% couverts par le livre`}
        style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
        <View style={[styles.fill, { width: `${book}%`, backgroundColor: colors.accentSoft }]} />
        <View style={[styles.fill, { width: `${known}%`, backgroundColor: colors.primary }]} />
      </View>

      {data.nextWords.length > 0 ? (
        <View style={styles.next}>
          <AppText variant="label" muted>
            Pour progresser dans cette sourate
          </AppText>
          {data.nextWords.slice(0, 3).map((word, i) => (
            <Fragment key={word.wordId}>
              {i > 0 ? <View style={[styles.separator, { backgroundColor: colors.border }]} /> : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${word.fr}, ${word.gain} mots de plus. Ouvrir la leçon`}
                onPress={() => router.push({ pathname: "/learn/[lessonId]", params: { lessonId: word.lessonId } })}
                style={({ pressed }) => [styles.word, { opacity: pressed ? 0.6 : 1 }]}>
                <View style={[styles.gain, { backgroundColor: colors.primarySoft }]}>
                  <AppText variant="caption" color={colors.primary}>
                    +{word.gain}
                  </AppText>
                </View>
                <AppText numberOfLines={1} style={styles.flex}>
                  {word.fr}
                </AppText>
                <ArabicText size={22}>{word.headword}</ArabicText>
                <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
              </Pressable>
            </Fragment>
          ))}
        </View>
      ) : null}

      <AppText variant="caption" faint>
        D’après les mots appris dans les leçons, comparés aux lemmes du Quranic Arabic Corpus.
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.lg, gap: spacing.md },
  headline: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  track: { height: 8, borderRadius: radius.pill, overflow: "hidden" },
  fill: { position: "absolute", left: 0, top: 0, bottom: 0, borderRadius: radius.pill },
  next: { gap: spacing.xs },
  word: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.xs },
  gain: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2, minWidth: 40, alignItems: "center" },
  separator: { height: StyleSheet.hairlineWidth },
});
