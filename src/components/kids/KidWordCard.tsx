import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { api } from "@/lib/api";
import { useOneShot } from "@/lib/audio";
import { KIDS, useKidsColors } from "@/lib/kids";
import { keys } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import { transliterate } from "@/lib/transliterate";
import type { QuranExample, VocabWord } from "@/lib/types";

/**
 * Son d'un mot du lexique, tel qu'il est récité dans le Coran (son occurrence-exemple). Hors
 * connexion, rien ne se passe : la carte reste lisible.
 */
export function useWordAudio() {
  const audio = useOneShot();
  const client = useQueryClient();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function play(wordId: string) {
    setLoadingId(wordId);
    try {
      const example = await client.fetchQuery({
        queryKey: keys.example(wordId),
        queryFn: async () => (await api<{ example: QuranExample | null }>(`/vocabulary/words/${wordId}/example`)).example,
        staleTime: 24 * 60 * 60 * 1000,
      });
      if (example?.word.audioUrl) audio.play(example.word.audioUrl);
    } catch {
      // Hors ligne : pas de son.
    } finally {
      setLoadingId(null);
    }
  }

  return { play, loadingId };
}

/**
 * Grande carte d'un mot pour un enfant : le mot arabe, sa phonétique et son sens, une étoile s'il
 * est appris (« à revoir » s'il a été oublié depuis). Toucher la carte fait entendre le mot.
 */
export function KidWordCard({
  word,
  status,
  loading,
  onPress,
}: {
  word: VocabWord;
  status: "learned" | "review" | null;
  loading: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const kc = useKidsColors();
  const arabic = word.headword ?? word.ar ?? "";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${word.fr ?? "Mot"} : écouter`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 }]}>
      <View style={styles.top}>
        {status === "learned" ? <Ionicons name="star" size={20} color={KIDS.sun} accessibilityLabel="Appris" /> : <View />}
        {loading ? <ActivityIndicator color={colors.primary} /> : <Ionicons name="volume-high" size={20} color={colors.primary} />}
      </View>
      <ArabicText size="xl" center>
        {arabic}
      </ArabicText>
      {arabic ? (
        <AppText variant="caption" color={colors.accent} center>
          {transliterate(arabic)}
        </AppText>
      ) : null}
      <AppText variant="bodyStrong" center numberOfLines={2}>
        {word.fr ?? ""}
      </AppText>
      {status === "review" ? (
        <View style={[styles.badge, { backgroundColor: kc.sunSoft }]}>
          <AppText variant="caption" color={kc.onSunSoft}>
            à revoir
          </AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { width: "47%", flexGrow: 1, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs, alignItems: "center", minHeight: 170, justifyContent: "center" },
  top: { alignSelf: "stretch", flexDirection: "row", justifyContent: "space-between" },
  badge: { borderRadius: radius.pill, paddingHorizontal: spacing.sm, paddingVertical: 2 },
});
