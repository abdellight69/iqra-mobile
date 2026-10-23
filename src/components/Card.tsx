import { Pressable, StyleSheet, View, type ViewProps, type ViewStyle } from "react-native";
import { useKidsTheme } from "@/lib/appearance-store";
import { elevation, radius, spacing, useColors } from "@/lib/theme";

export type CardProps = ViewProps & {
  onPress?: () => void;
  padded?: boolean;
  /** default : surface blanche ombrée · flat : surface atténuée · primary : vert profond · accent : or pâle */
  tone?: "default" | "flat" | "primary" | "accent";
};

export function Card({ onPress, padded = true, tone = "default", style, children, ...props }: CardProps) {
  const colors = useColors();
  const kids = useKidsTheme();
  const background = {
    default: colors.surface,
    flat: colors.surfaceMuted,
    primary: colors.hero,
    accent: colors.accentSoft,
  }[tone];
  const base: ViewStyle[] = [
    styles.card,
    // Profil enfant : des cartes plus rondes, partout dans l'app.
    kids ? styles.kidsCard : {},
    { backgroundColor: background },
    tone === "default" ? elevation(colors) : {},
    padded ? styles.padded : {},
  ];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [...base, { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] }, style as ViewStyle]}
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
  card: { borderRadius: radius.lg },
  kidsCard: { borderRadius: radius.xl },
  padded: { padding: spacing.xl - 4 },
});
