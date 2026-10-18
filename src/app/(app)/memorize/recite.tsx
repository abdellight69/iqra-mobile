import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RecitationRecorder, useStatusColors } from "@/components/RecitationCheck";
import { Screen } from "@/components/Screen";
import { MAX_PASSAGE_SECONDS, useRecitationCheck } from "@/lib/recitation";
import { useChapter } from "@/lib/queries";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { RecitationCheck } from "@/lib/types";

/** Réciter tout un passage d'une traite, puis voir verset par verset les mots oubliés. */
export default function RecitePassage() {
  const colors = useColors();
  const params = useLocalSearchParams<{ chapterId: string; from: string; to: string }>();
  const chapter = useChapter(Number(params.chapterId));
  const [result, setResult] = useState<RecitationCheck | null>(null);
  const [attempt, setAttempt] = useState(0);
  const from = `${params.chapterId}:${params.from}`;
  const to = `${params.chapterId}:${params.to}`;
  const range = params.from === params.to ? `verset ${params.from}` : `versets ${params.from} à ${params.to}`;

  return (
    <Screen edges={[]}>
      <View style={styles.header}>
        <AppText variant="label" muted>
          {chapter.data?.nameSimple ?? `Sourate ${params.chapterId}`} · {range}
        </AppText>
        <AppText variant="title">Réciter le passage</AppText>
        <AppText muted>Récitez de mémoire, d’une traite, sans regarder le texte. Les versets réapparaissent ensuite, mots oubliés en couleur.</AppText>
      </View>
      {result ? (
        <PassageResult
          result={result}
          onRetry={() => {
            setResult(null);
            setAttempt((a) => a + 1);
          }}
        />
      ) : (
        <Recorder key={attempt} from={from} to={to} onResult={setResult} />
      )}
      {!result ? (
        <AppText variant="caption" color={colors.textMuted}>
          Résultat indicatif : la reconnaissance automatique peut se tromper. Le tajwid n’est pas évalué.
        </AppText>
      ) : null}
    </Screen>
  );
}

function Recorder({ from, to, onResult }: { from: string; to: string; onResult: (r: RecitationCheck) => void }) {
  const check = useRecitationCheck({ from, to }, onResult, MAX_PASSAGE_SECONDS);
  return (
    <RecitationRecorder
      state={check.state}
      seconds={check.seconds}
      maxSeconds={MAX_PASSAGE_SECONDS}
      onStart={() => void check.start()}
      onStop={() => void check.stopAndCheck()}
      onCancel={() => void check.cancel()}
    />
  );
}

function PassageResult({ result, onRetry }: { result: RecitationCheck; onRetry: () => void }) {
  const colors = useColors();
  const statusColors = useStatusColors();
  const verseKeys = result.verseKeys ?? [result.verseKey];
  const toReview = (result.verses ?? []).filter((v) => v.ok < v.total).map((v) => v.verseKey);
  const { ok, total } = result.summary;

  return (
    <View style={styles.result}>
      <Card style={styles.summary}>
        <Ionicons name={toReview.length === 0 ? "checkmark-circle" : "alert-circle-outline"} size={28} color={toReview.length === 0 ? colors.success : colors.accent} />
        <View style={styles.flex}>
          <AppText variant="headline">
            {ok} mot{ok > 1 ? "s" : ""} reconnu{ok > 1 ? "s" : ""} sur {total}
          </AppText>
          <AppText variant="caption" muted>
            {toReview.length === 0 ? "Aucun verset à reprendre." : `${toReview.length} verset${toReview.length > 1 ? "s" : ""} à reprendre`}
          </AppText>
        </View>
      </Card>

      {verseKeys.map((key) => {
        const words = result.words.filter((w) => (w.verseKey ?? result.verseKey) === key);
        const counts = result.verses?.find((v) => v.verseKey === key);
        return (
          <Card key={key} style={styles.verse}>
            <AppText variant="caption" muted>
              {key}
              {counts && counts.ok < counts.total ? ` · ${counts.total - counts.ok} mot${counts.total - counts.ok > 1 ? "s" : ""} à reprendre` : ""}
            </AppText>
            <View style={styles.words}>
              {words.map((w) => {
                const tone = statusColors(w.status);
                return (
                  <View key={w.location} style={[styles.word, tone && { backgroundColor: tone.background }]}>
                    <AppText style={[styles.arabic, { color: tone?.text ?? colors.arabic }]}>{w.textUthmani}</AppText>
                  </View>
                );
              })}
            </View>
          </Card>
        );
      })}

      {toReview.length > 0 ? (
        <Button
          title={`Réviser ${toReview.length === 1 ? "ce verset" : `ces ${toReview.length} versets`}`}
          icon="repeat"
          onPress={() => router.push({ pathname: "/memorize/session", params: { keys: toReview.join(",") } })}
        />
      ) : null}
      <Button title="Réciter à nouveau" variant="secondary" icon="mic" onPress={onRetry} />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { gap: spacing.xs },
  result: { gap: spacing.md },
  summary: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  verse: { gap: spacing.xs },
  words: { flexDirection: "row-reverse", flexWrap: "wrap", columnGap: spacing.xs },
  word: { borderRadius: radius.sm, paddingHorizontal: 4 },
  arabic: { fontFamily: fonts.arabic, fontSize: 24, lineHeight: 46 },
});
