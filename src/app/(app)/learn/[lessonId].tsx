import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { Fragment, useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { QuranExample } from "@/components/QuranExample";
import { ErrorState, LoadingState } from "@/components/States";
import { VerbTable } from "@/components/VerbTable";
import { useLesson, useLessons } from "@/lib/queries";
import { elevation, radius, spacing, useColors } from "@/lib/theme";
import type { VocabWord } from "@/lib/types";

/**
 * Dans la 1re partie du livre, le total imprimé (« ~32263 ») couvre les 12 fiches de la partie ;
 * dans les suivantes, il s'agit du total de la fiche.
 */
function totalLabel(total: string): string {
  return total.startsWith("~") ? `${total} mots pour les 12 fiches de cette partie` : `${total} mots au total dans cette fiche`;
}

/** Regroupe les mots consécutifs qui partagent un même sous-titre de tableau. */
function groupWords(words: VocabWord[]) {
  const groups: { titleFr: string | null; titleAr: string | null; words: VocabWord[] }[] = [];
  for (const word of words) {
    const last = groups.at(-1);
    if (last && last.titleFr === word.groupTitleFr && last.titleAr === word.groupTitleAr) last.words.push(word);
    else groups.push({ titleFr: word.groupTitleFr, titleAr: word.groupTitleAr, words: [word] });
  }
  return groups;
}

export default function LessonDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const lesson = useLesson(lessonId);
  const lessons = useLessons();
  const summary = lessons.data?.find((l) => l.id === lessonId);
  const groups = useMemo(() => groupWords(lesson.data?.words ?? []), [lesson.data]);

  if (lesson.isPending) return <LoadingState />;
  if (lesson.isError) return <ErrorState error={lesson.error} onRetry={() => void lesson.refetch()} />;
  const { lesson: info } = lesson.data;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ title: "" }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 110 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <AppText variant="label" color={colors.accent}>
            {info.part}
          </AppText>
          <AppText variant="title">{info.title.replace(/^[A-Z] - /, "")}</AppText>
          {info.titleAr ? <ArabicText size={24}>{info.titleAr}</ArabicText> : null}
          {info.subtitle ? <AppText muted>{info.subtitle}</AppText> : null}
          <AppText variant="caption" faint>
            Fiche p. {info.sourcePage} du livre « 80% des mots du Qour’ân »{info.totalWords ? ` · ${totalLabel(info.totalWords)}` : ""}
          </AppText>
        </View>

        {groups.map((group, g) => (
          <View key={g} style={styles.groupWrap}>
            {group.titleFr || group.titleAr ? (
              <View style={styles.groupTitle}>
                <AppText variant="label" muted style={styles.flex}>
                  {group.titleFr}
                </AppText>
                {group.titleAr ? <ArabicText size={20}>{group.titleAr}</ArabicText> : null}
              </View>
            ) : null}
            <View style={[styles.group, { backgroundColor: colors.surface }, elevation(colors)]}>
              {group.words.map((word, i) => (
                <Fragment key={word.id}>
                  {i > 0 ? <View style={[styles.separator, { backgroundColor: colors.border }]} /> : null}
                  <WordRow word={word} />
                </Fragment>
              ))}
            </View>
          </View>
        ))}

        {info.remarks.length ? (
          <Card tone="flat" style={styles.remarks}>
            <AppText variant="label" muted>
              Remarques du livre
            </AppText>
            {info.remarks.map((r, i) => (
              <AppText key={i} variant="caption">
                {r}
              </AppText>
            ))}
          </Card>
        ) : null}
      </ScrollView>

      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background }]}>
        <Button
          title={summary?.completed ? "Refaire la leçon" : "Commencer la leçon"}
          disabled={summary ? !summary.unlocked : false}
          onPress={() => router.push({ pathname: "/learn/session", params: { lessonId } })}
        />
      </View>
    </View>
  );
}

function WordRow({ word }: { word: VocabWord }) {
  const colors = useColors();
  return (
    <View style={[styles.word, word.isPatternRow && { backgroundColor: colors.surfaceMuted }]}>
      <View style={styles.wordTop}>
        <View style={styles.flex}>
          <AppText variant={word.isPatternRow ? "caption" : "bodyStrong"} muted={word.isPatternRow}>
            {word.fr ?? (word.isPatternRow ? "Modèle (schème)" : "—")}
          </AppText>
          <View style={styles.meta}>
            {word.sideLabel ? (
              <AppText variant="label" color={colors.accent}>
                {word.sideLabel}
              </AppText>
            ) : null}
            {word.arNote ? (
              <AppText variant="caption" muted>
                {word.arNote}
              </AppText>
            ) : null}
            {word.occurrences !== null ? (
              <AppText variant="caption" faint>
                {word.occurrences} occ.
              </AppText>
            ) : null}
          </View>
        </View>
        {word.ar ? <ArabicText size={30}>{word.ar}</ArabicText> : null}
      </View>
      {!word.isPatternRow && word.fr ? <QuranExample wordId={word.id} compact /> : null}
      {word.verb ? <VerbTable verb={word.verb} /> : null}
      {word.sourceUncertain ? (
        <View style={styles.warning}>
          <Ionicons name="information-circle-outline" size={14} color={colors.textMuted} />
          <AppText variant="caption" muted style={styles.flex}>
            Vocalisation incomplète ou ambiguë dans le document source, reproduite telle quelle.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl - 4, gap: spacing.xl },
  header: { gap: spacing.sm },
  groupWrap: { gap: spacing.sm },
  groupTitle: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.xs },
  group: { borderRadius: radius.lg, overflow: "hidden" },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.lg },
  word: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  wordTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  meta: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", columnGap: spacing.sm, marginTop: 2 },
  warning: { flexDirection: "row", gap: spacing.xs, alignItems: "center" },
  remarks: { gap: spacing.sm },
  cta: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.xl - 4, paddingTop: spacing.md },
});
