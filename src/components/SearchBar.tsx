import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import { radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

/**
 * Barre « Rechercher partout » : un faux champ qui ouvre l'écran de recherche unifiée
 * (versets, sourates, mots du lexique, leçons), avec le clavier prêt.
 */
export function SearchBar({ placeholder = "Rechercher un verset, une sourate, un mot…" }: { placeholder?: string }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="search"
      accessibilityLabel="Rechercher partout"
      onPress={() => router.push("/search")}
      style={({ pressed }) => [styles.bar, { backgroundColor: colors.surfaceMuted, opacity: pressed ? 0.7 : 1 }]}>
      <Ionicons name="search" size={17} color={colors.textMuted} />
      <View style={styles.flex}>
        <AppText muted numberOfLines={1}>
          {placeholder}
        </AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", gap: spacing.sm, borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 48 },
  flex: { flex: 1 },
});
