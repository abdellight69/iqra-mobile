import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import { radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

/** Pastille « Soutien » à côté du nom d'un membre abonné (docs/soutien-v1.md). */
export function SupporterBadge() {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityLabel="Membre Soutien"
      style={[styles.badge, { backgroundColor: colors.accentSoft }]}>
      <Ionicons name="sparkles" size={11} color={colors.accent} />
      <AppText variant="caption" color={colors.accent} style={styles.label}>
        Soutien
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
  },
  label: { fontSize: 12, lineHeight: 16 },
});
