import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { StyleSheet, View } from "react-native";
import { radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

export function StatTile({
  icon,
  value,
  label,
  color,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  value: string | number;
  label: string;
  color?: string;
}) {
  const colors = useColors();
  return (
    <View style={[styles.tile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={color ?? colors.primary} />
      <AppText variant="title">{value}</AppText>
      <AppText variant="caption" muted numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md, gap: 2 },
});
