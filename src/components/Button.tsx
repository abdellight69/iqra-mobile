import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import { radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "light" | "onDark";

export type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: ComponentProps<typeof Ionicons>["name"];
  loading?: boolean;
  disabled?: boolean;
  size?: "md" | "lg";
  style?: ViewStyle;
};

export function Button({ title, onPress, variant = "primary", icon, loading, disabled, size = "lg", style }: ButtonProps) {
  const colors = useColors();
  const palette: Record<Variant, { bg: string; fg: string; border: string }> = {
    primary: { bg: colors.primary, fg: colors.onPrimary, border: colors.primary },
    secondary: { bg: colors.surfaceMuted, fg: colors.text, border: colors.surfaceMuted },
    ghost: { bg: "transparent", fg: colors.primary, border: "transparent" },
    danger: { bg: colors.dangerSoft, fg: colors.danger, border: colors.dangerSoft },
    // Sur une carte héro : fond blanc, texte dans le vert profond du thème (et non le vert sapin en dur).
    light: { bg: "#FFFFFF", fg: colors.primaryStrong, border: "#FFFFFF" },
    onDark: { bg: "transparent", fg: "#FFFFFF", border: "#FFFFFF55" },
  };
  const { bg, fg, border } = palette[variant];
  const inactive = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        void Haptics.selectionAsync();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.base,
        size === "lg" ? styles.lg : styles.md,
        { backgroundColor: bg, borderColor: border, opacity: inactive ? 0.45 : pressed ? 0.88 : 1 },
        pressed && { transform: [{ scale: 0.985 }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.row}>
          {icon && <Ionicons name={icon} size={18} color={fg} />}
          <AppText variant="bodyStrong" color={fg}>
            {title}
          </AppText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  lg: { minHeight: 54, paddingHorizontal: spacing.xl },
  md: { minHeight: 44, paddingHorizontal: spacing.lg + 2 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
