import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, type ViewStyle } from "react-native";
import { useColors } from "@/lib/theme";

export type IconButtonProps = {
  icon: ComponentProps<typeof Ionicons>["name"];
  label: string;
  onPress: () => void;
  size?: number;
  tone?: "plain" | "filled" | "primary";
  color?: string;
  style?: ViewStyle;
};

/** Bouton icône circulaire, avec une zone de toucher d'au moins 40 points. */
export function IconButton({ icon, label, onPress, size = 20, tone = "plain", color, style }: IconButtonProps) {
  const colors = useColors();
  const background = tone === "filled" ? colors.surfaceMuted : tone === "primary" ? colors.primary : "transparent";
  const fg = color ?? (tone === "primary" ? colors.onPrimary : tone === "filled" ? colors.text : colors.textMuted);
  const box = Math.max(40, size + 20);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      onPress={onPress}
      style={({ pressed }) => [
        { width: box, height: box, borderRadius: box / 2, alignItems: "center", justifyContent: "center", backgroundColor: background, opacity: pressed ? 0.6 : 1 },
        style,
      ]}>
      <Ionicons name={icon} size={size} color={fg} />
    </Pressable>
  );
}
