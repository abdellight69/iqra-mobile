import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Fragment, type ComponentProps } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { QuranExample } from "@/components/QuranExample";
import { ErrorState, LoadingState } from "@/components/States";
import { useTheme } from "@/lib/queries";
import { elevation, radius, spacing, useColors } from "@/lib/theme";
import { annotateArabic, transliterate } from "@/lib/transliterate";
import type { VocabWord } from "@/lib/types";

/** Un thème de vocabulaire coranique : ses mots, ceux déjà appris, et la séance suivante. */
export default function ThemeDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { themeId } = useLocalSearchParams<{ themeId: string }>();
  const theme = useTheme(themeId);

  if (theme.isPending) return <LoadingState />;
  if (theme.isError) return <ErrorState error={theme.error} onRetry={() => void theme.refetch()} />;
  const { theme: info, words, learned } = theme.data;
  const learnedSet = new Set(learned);
  const remaining = words.length - learned.length;
  const done = remaining === 0;
  const next = Math.min(6, Math.max(1, remaining));

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "" }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
            <Ionicons name={(info.icon ?? "pricetag-outline") as ComponentProps<typeof Ionicons>["name"]} size={28} color={colors.accent} />
          </View>
          <AppText variant="label" color={colors.accent}>
            Thème
          </AppText>
          <AppText variant="title">{info.title}</AppText>
          {info.titleAr ? (
            <View style={styles.titleAr}>
              <ArabicText size={24}>{info.titleAr}</ArabicText>
              <AppText variant="caption" italic color={colors.accent}>
                {transliterate(info.titleAr)}
              </AppText>
            </View>
          ) : null}
          {info.intro ? <AppText muted>{info.intro}</AppText> : null}
          <View style={styles.progress}>
            <ProgressBar value={words.length ? learned.length / words.length : 0} color={colors.accent} />
            <AppText variant="caption" muted>
              {learned.length}/{words.length} mots appris · chaque mot est tiré d’un verset du Coran
            </AppText>
          </View>
        </View>

        <View style={[styles.group, { backgroundColor: colors.surface }, elevation(colors)]}>
          {words.map((word, i) => (
            <Fragment key={word.id}>
              {i > 0 ? <View style={[styles.separator, { backgroundColor: colors.border }]} /> : null}
              <WordRow word={word} learned={learnedSet.has(word.id)} />
            </Fragment>
          ))}
        </View>
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background }]}>
        <Button
          title={done ? "Revoir le thème" : `Apprendre ${next} mot${next > 1 ? "s" : ""}`}
          onPress={() => router.push({ pathname: "/learn/session", params: { themeId, size: String(next) } })}
        />
      </View>
    </View>
  );
}

function WordRow({ word, learned }: { word: VocabWord; learned: boolean }) {
  const colors = useColors();
  const arabic = word.headword ?? word.ar;
  return (
    <View style={styles.word}>
      <View style={styles.wordTop}>
        <View style={[styles.check, { backgroundColor: learned ? colors.successSoft : colors.surfaceMuted }]}>
          <Ionicons name={learned ? "checkmark" : "ellipse-outline"} size={14} color={learned ? colors.success : colors.textFaint} />
        </View>
        <View style={styles.flex}>
          <AppText variant="bodyStrong">{word.fr ?? "—"}</AppText>
          <View style={styles.meta}>
            {word.arNote ? (
              <AppText variant="caption" muted numberOfLines={2}>
                {annotateArabic(word.arNote)}
              </AppText>
            ) : null}
            {word.occurrences !== null ? (
              <AppText variant="caption" faint>
                {word.occurrences} occ.
              </AppText>
            ) : null}
          </View>
        </View>
        {arabic ? (
          <View style={styles.arabic}>
            <ArabicText size={30}>{arabic}</ArabicText>
            <AppText variant="caption" italic color={colors.accent} style={styles.phonetic} accessibilityLabel={`Phonétique : ${transliterate(arabic)}`}>
              {transliterate(arabic)}
            </AppText>
          </View>
        ) : null}
      </View>
      {word.fr ? <QuranExample wordId={word.id} compact /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl - 4, gap: spacing.xl },
  header: { gap: spacing.sm },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  titleAr: { gap: 2 },
  progress: { gap: spacing.xs, marginTop: spacing.xs },
  group: { borderRadius: radius.lg, overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
  word: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  wordTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  check: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: spacing.sm, marginTop: 2 },
  arabic: { alignItems: "flex-end", gap: 2, maxWidth: "45%" },
  phonetic: { textAlign: "right" },
  cta: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl - 4, paddingTop: spacing.md },
});
