import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { api } from "@/lib/api";
import { useOneShot } from "@/lib/audio";
import { KIDS } from "@/lib/kids";
import { useLearnedWords } from "@/lib/missions";
import { keys } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { LearnedWord, QuranExample } from "@/lib/types";

/**
 * « Mes mots » : la collection des mots déjà réussis, en grandes cartes. Toucher une carte fait
 * entendre le mot tel qu'il est récité dans le Coran.
 */
export default function MyWords() {
  const words = useLearnedWords();
  const audio = useOneShot();
  const client = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  async function play(word: LearnedWord) {
    setLoading(word.id);
    try {
      const example = await client.fetchQuery({
        queryKey: keys.example(word.id),
        queryFn: async () => (await api<{ example: QuranExample | null }>(`/vocabulary/words/${word.id}/example`)).example,
        staleTime: 24 * 60 * 60 * 1000,
      });
      if (example?.word.audioUrl) audio.play(example.word.audioUrl);
    } catch {
      // Hors ligne : la carte reste lisible, sans le son.
    } finally {
      setLoading(null);
    }
  }

  if (words.isPending) return <LoadingState />;
  if (words.isError) return <ErrorState error={words.error} onRetry={() => void words.refetch()} />;
  if (words.data.length === 0) {
    return <EmptyState icon="albums-outline" title="Pas encore de mots" message="Fais tes missions et tes petits jeux : chaque mot trouvé rejoint ta collection." />;
  }

  return (
    <Screen edges={[]} onRefresh={() => void words.refetch()} refreshing={words.isRefetching}>
      <AppText variant="headline">
        {words.data.length} mot{words.data.length > 1 ? "s" : ""} dans ta collection
      </AppText>
      <View style={styles.grid}>
        {words.data.map((word) => (
          <WordCard key={word.id} word={word} loading={loading === word.id} onPress={() => void play(word)} />
        ))}
      </View>
    </Screen>
  );
}

function WordCard({ word, loading, onPress }: { word: LearnedWord; loading: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${word.fr ?? "Mot"} : écouter`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 }]}>
      <ArabicText size="xl" center>
        {word.headword ?? word.ar ?? ""}
      </ArabicText>
      <AppText variant="bodyStrong" center numberOfLines={2}>
        {word.fr ?? ""}
      </AppText>
      <View style={styles.footer}>
        {loading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="volume-high" size={20} color={colors.primary} />}
        {word.known ? null : (
          <View style={[styles.badge, { backgroundColor: KIDS.sunSoft }]}>
            <AppText variant="caption" color={KIDS.sunInk}>
              à revoir
            </AppText>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  card: { width: "47%", flexGrow: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, alignItems: "center", minHeight: 150, justifyContent: "center" },
  footer: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: spacing.xs },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
});
