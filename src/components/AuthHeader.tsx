import Ionicons from "@expo/vector-icons/Ionicons";
import { Pressable, StyleSheet, View } from "react-native";
import { spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

export function AuthHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Retour" hitSlop={12} onPress={onBack} style={styles.back}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </Pressable>
      ) : null}
      <AppText variant="display">{title}</AppText>
      {subtitle ? <AppText muted>{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginBottom: spacing.md },
  back: { marginLeft: -spacing.sm, marginBottom: spacing.md, alignSelf: "flex-start", padding: spacing.xs },
});
