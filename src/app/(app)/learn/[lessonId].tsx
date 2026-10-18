import Ionicons from "@expo/vector-icons/Ionicons";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { FlatList, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ErrorState, LoadingState } from "@/components/States";
import { VerbTable } from "@/components/VerbTable";
import { useLesson, useLessons } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";
import type { VocabWord } from "@/lib/types";

/**
 * Dans la 1re partie du livre, le total imprimé (« ~32263 ») couvre les 12 fiches de la partie ;
 * dans les suivantes, il s'agit du total de la fiche.
 */
function totalLabel(total: string): string {
  return total.startsWith("~") ? `${total} mots pour les 12 fiches de cette partie` : `${total} mots au total dans cette fiche`;
}

export default function LessonDetail() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const lesson = useLesson(lessonId);
  const lessons = useLessons();
  const summary = lessons.data?.find((l) => l.id === lessonId);

  if (lesson.isPending) return <LoadingState />;
  if (lesson.isError) return <ErrorState error={lesson.error} onRetry={() => void lesson.refetch()} />;
  const { lesson: info, words } = lesson.data;

  return (
    <View style={styles.flex}>
      <Stack.Screen options={{ title: info.title.replace(/^[A-Z] - /, "") }} />
      <FlatList
        data={words}
        keyExtractor={(w) => w.id}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <AppText variant="label" color={colors.primary}>
              {info.part}
            </AppText>
            <AppText variant="title">{info.title}</AppText>
            {info.titleAr ? <ArabicText size="md">{info.titleAr}</ArabicText> : null}
            {info.subtitle ? <AppText muted>{info.subtitle}</AppText> : null}
            <AppText variant="caption" muted>
              Fiche p. {info.sourcePage} du livre « 80% des mots du Qour’ân »
              {info.totalWords ? ` · ${totalLabel(info.totalWords)}` : ""}
            </AppText>
          </View>
        }
        renderItem={({ item, index }) => <WordRow word={item} showGroup={index === 0 || words[index - 1]?.groupTitleFr !== item.groupTitleFr} />}
        ListFooterComponent={
          info.remarks.length ? (
            <Card style={styles.remarks}>
              <AppText variant="label" muted>
                Remarques du livre
              </AppText>
              {info.remarks.map((r, i) => (
                <AppText key={i} variant="caption">
                  {r}
                </AppText>
              ))}
            </Card>
          ) : undefined
        }
      />
      <View style={[styles.cta, { paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background }]}>
        <Button
          title={summary?.completed ? "Refaire la leçon" : "Commencer la leçon"}
          icon="play"
          disabled={summary ? !summary.unlocked : false}
          onPress={() => router.push({ pathname: "/learn/session", params: { lessonId } })}
        />
      </View>
    </View>
  );
}

function WordRow({ word, showGroup }: { word: VocabWord; showGroup: boolean }) {
  const colors = useColors();
  return (
    <View style={{ gap: spacing.sm }}>
      {showGroup && (word.groupTitleFr || word.groupTitleAr) ? (
        <View style={styles.group}>
          <AppText variant="label" color={colors.primary}>
            {word.groupTitleFr}
          </AppText>
          {word.groupTitleAr ? <ArabicText size="sm">{word.groupTitleAr}</ArabicText> : null}
        </View>
      ) : null}
      <Card style={[styles.word, word.isPatternRow && { backgroundColor: colors.surfaceMuted }]}>
        <View style={styles.wordTop}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{word.fr ?? (word.isPatternRow ? "Modèle (schème)" : "—")}</AppText>
            <View style={styles.meta}>
              {word.sideLabel ? (
                <AppText variant="caption" color={colors.accent}>
                  {word.sideLabel}
                </AppText>
              ) : null}
              {word.occurrences !== null ? (
                <AppText variant="caption" muted>
                  {word.occurrences} occ.
                </AppText>
              ) : null}
            </View>
          </View>
          {word.ar ? <ArabicText size="lg">{word.ar}</ArabicText> : null}
        </View>
        {word.arNote ? (
          <AppText variant="caption" muted style={{ textAlign: "right" }}>
            {word.arNote}
          </AppText>
        ) : null}
        {word.verb ? <VerbTable verb={word.verb} /> : null}
        {word.sourceUncertain ? (
          <View style={styles.warning}>
            <Ionicons name="alert-circle-outline" size={14} color={colors.textMuted} />
            <AppText variant="caption" muted style={styles.flex}>
              Vocalisation incomplète ou ambiguë dans le document source, reproduite telle quelle.
            </AppText>
          </View>
        ) : null}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg },
  header: { gap: spacing.xs, marginBottom: spacing.lg },
  group: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  word: { gap: spacing.sm },
  wordTop: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  meta: { flexDirection: "row", gap: spacing.sm },
  warning: { flexDirection: "row", gap: spacing.xs, alignItems: "center" },
  remarks: { gap: spacing.sm, marginTop: spacing.lg },
  cta: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.md },
});
