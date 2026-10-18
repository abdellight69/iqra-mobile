import { Pressable, StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { radius, spacing, useColors } from "@/lib/theme";

export type CardProps = ViewProps & { onPress?: () => void; padded?: boolean; tone?: "default" | "primary" | "accent" };

export function Card({ onPress, padded = true, tone = "default", style, children, ...props }: CardProps) {
  const colors = useColors();
  const background = tone === "primary" ? colors.primary : tone === "accent" ? colors.accentSoft : colors.surface;
  const base: ViewStyle[] = [
    styles.card,
    { backgroundColor: background, borderColor: tone === "default" ? colors.border : background },
    padded && styles.padded,
  ].filter(Boolean) as ViewStyle[];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [...base, { opacity: pressed ? 0.9 : 1 }, style as ViewStyle]}
        {...props}>
        {children}
      </Pressable>
    );
  }
  return (
    <View style={[...base, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1 },
  padded: { padding: spacing.lg },
});
