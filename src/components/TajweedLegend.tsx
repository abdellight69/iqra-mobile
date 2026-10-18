import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Pressable, StyleSheet, useColorScheme, View } from "react-native";
import { TAJWEED_RULES } from "@/lib/tajweed";
import { radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

/** Légende des couleurs du tajwid, repliable, affichée en tête de sourate quand le mode est actif. */
export function TajweedLegend() {
  const colors = useColors();
  const dark = useColorScheme() === "dark";
  const [open, setOpen] = useState(false);
  // Les règles de même couleur (lettres non prononcées, idghâm apparentés) partagent une ligne.
  const groups = new Map<string, { color: string; names: string[]; description: string }>();
  for (const rule of Object.values(TAJWEED_RULES)) {
    const color = dark ? rule.dark : rule.light;
    const group = groups.get(color);
    if (group) group.names.push(rule.name);
    else groups.set(color, { color, names: [rule.name], description: rule.description });
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceMuted }]}>
      <Pressable accessibilityRole="button" onPress={() => setOpen((o) => !o)} style={styles.header}>
        <Ionicons name="color-palette-outline" size={16} color={colors.textMuted} />
        <AppText variant="caption" style={styles.flex}>
          Couleurs du tajwid
        </AppText>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color={colors.textMuted} />
      </Pressable>
      {open ? (
        <View style={styles.list}>
          {[...groups.values()].map((group) => (
            <View key={group.color} style={styles.row}>
              <View style={[styles.dot, { backgroundColor: group.color }]} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong" color={group.color}>
                  {group.names.join(" · ")}
                </AppText>
                {group.names.length === 1 ? (
                  <AppText variant="caption" muted>
                    {group.description}
                  </AppText>
                ) : null}
              </View>
            </View>
          ))}
          <AppText variant="caption" faint>
            Texte balisé : Quran.com. Touchez un mot pour voir ses règles.
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  list: { gap: spacing.sm, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  row: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-start" },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 6 },
});
