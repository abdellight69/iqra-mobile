import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { KidWordCard, useKidWordAudio } from "@/components/kids/KidWordCard";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { useLearnedWords } from "@/lib/missions";
import { spacing } from "@/lib/theme";

/**
 * « Mes mots » : la collection des mots déjà réussis, en grandes cartes. Toucher une carte fait
 * entendre le mot tel qu'il est récité dans le Coran.
 */
export default function MyWords() {
  const words = useLearnedWords();
  const audio = useKidWordAudio();

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
          <KidWordCard key={word.id} word={word} status={word.known ? null : "review"} loading={audio.loadingId === word.id} onPress={() => void audio.play(word.id)} />
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
});
