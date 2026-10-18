import { StyleSheet, View } from "react-native";
import { radius, spacing, useColors } from "@/lib/theme";
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
    <View style={[styles.table, { borderColor: colors.border }]}>
      {columns.map((column) => (
        <View key={column.key} style={[styles.cell, { borderColor: colors.border }]}>
          <AppText variant="caption" muted>
            {column.label}
          </AppText>
          <ArabicText size="sm" center>
            {verb[column.key]}
          </ArabicText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  table: { flexDirection: "row-reverse", flexWrap: "wrap", borderWidth: 1, borderRadius: radius.md, overflow: "hidden" },
  cell: { flexGrow: 1, minWidth: "30%", alignItems: "center", padding: spacing.sm, borderWidth: StyleSheet.hairlineWidth },
});
