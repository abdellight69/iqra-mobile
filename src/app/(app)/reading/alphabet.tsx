import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Screen } from "@/components/Screen";
import { ErrorState, LoadingState } from "@/components/States";
import { useAlphabet } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { AlphabetLetter } from "@/lib/types";

/** Tableau de l'alphabet, dans l'ordre arabe (de droite à gauche) ; toucher une lettre ouvre sa fiche. */
export default function AlphabetTable() {
  const overview = useAlphabet();
  if (overview.isPending) return <LoadingState />;
  if (overview.isError) return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;
  const letters = overview.data.letters;

  return (
    <Screen edges={[]}>
      <AppText muted>Touchez une lettre pour voir ses formes, l’entendre dans un mot du Coran et lire comment elle se prononce.</AppText>
      <View style={styles.grid}>
        {letters.slice(0, 28).map((l) => (
          <LetterTile key={l.id} letter={l} />
        ))}
      </View>
      <AppText variant="label" muted>
        Formes particulières
      </AppText>
      <View style={styles.grid}>
        {letters.slice(28).map((l) => (
          <LetterTile key={l.id} letter={l} />
        ))}
      </View>
    </Screen>
  );
}

function LetterTile({ letter }: { letter: AlphabetLetter }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={letter.name}
      onPress={() => router.push({ pathname: "/reading/letter/[id]", params: { id: letter.id } })}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: pressed ? colors.primarySoft : colors.surface, borderColor: colors.border },
      ]}>
      <ArabicText size={36} center style={styles.glyph}>
        {letter.char}
      </ArabicText>
      <AppText variant="caption" muted center numberOfLines={1}>
        {letter.name}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  glyph: { lineHeight: 72, paddingBottom: 12 },
  grid: { flexDirection: "row-reverse", flexWrap: "wrap", gap: spacing.sm },
  tile: { width: "23%", flexGrow: 1, maxWidth: "24%", borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, paddingVertical: spacing.sm, alignItems: "center" },
});
