import { StyleSheet, View } from "react-native";
import { radius, spacing, useColors } from "@/lib/theme";
import { transliterate } from "@/lib/transliterate";
import type { VerbForms } from "@/lib/types";
import { AppText } from "./AppText";
import { ArabicText } from "./ArabicText";

// Ordre et intitulés des colonnes du livre (de droite à gauche).
const COLUMNS: { key: keyof VerbForms; label: string }[] = [
  { key: "past", label: "Passé" },
  { key: "present", label: "Présent" },
  { key: "imperative", label: "Impératif" },
  { key: "activeParticiple", label: "Nom sujet" },
  { key: "verbalNoun", label: "Nom d'action" },
];

export function VerbTable({ verb }: { verb: VerbForms }) {
  const colors = useColors();
  const columns = COLUMNS.filter((c) => verb[c.key]);
  if (columns.length === 0) return null;
  return (
    <View style={styles.table}>
      {columns.map((column) => (
        <View key={column.key} style={[styles.cell, { backgroundColor: colors.surfaceMuted }]}>
          <AppText variant="label" muted style={styles.label}>
            {column.label}
          </AppText>
          <ArabicText size="sm" center>
            {verb[column.key]}
          </ArabicText>
          <AppText variant="caption" italic color={colors.accent} center numberOfLines={1} style={styles.phonetic}>
            {transliterate(verb[column.key]!)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { flexDirection: "row-reverse", flexWrap: "wrap", gap: 4 },
  cell: { flexGrow: 1, minWidth: "30%", alignItems: "center", paddingVertical: spacing.sm, paddingHorizontal: spacing.xs, borderRadius: radius.sm },
  label: { fontSize: 9, letterSpacing: 1 },
  phonetic: { fontSize: 11, lineHeight: 15 },
});
