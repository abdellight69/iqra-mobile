import { useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";
import { LetterCard } from "@/components/LetterCard";
import { ErrorState, LoadingState } from "@/components/States";
import { useAlphabet, useMe, useVerse } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";

/** Fiche d'une lettre, ouverte depuis le tableau de l'alphabet. Le mot d'exemple est lu depuis l'API (texte et audio). */
export default function LetterSheet() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const overview = useAlphabet();
  const me = useMe();
  const letter = overview.data?.letters.find((l) => l.id === id);
  const [chapter, verse, position] = (letter?.example.location ?? "1:1:1").split(":");
  const verseData = useVerse(`${chapter}:${verse}`, me.data?.translationId ?? null);

  if (overview.isPending) return <LoadingState />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;
  if (!letter) return <ErrorState error={new Error("Lettre introuvable")} />;

  const word = verseData.data?.words.find((w) => w.type === "word" && w.position === Number(position));
  return (
    <ScrollView style={{ backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      <LetterCard
        letter={letter}
        example={word ? { location: word.location, text: word.textUthmani, reading: letter.example.reading, audioUrl: word.audioUrl } : null}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({ content: { padding: spacing.lg, paddingTop: spacing.xl } });
