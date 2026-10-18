import { StyleSheet, View } from "react-native";
import { spacing } from "@/lib/theme";
import { AppText } from "./AppText";
import { IconButton } from "./IconButton";

export function AuthHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <View style={styles.container}>
      {onBack ? <IconButton icon="chevron-back" label="Retour" tone="filled" onPress={onBack} style={styles.back} /> : null}
      <AppText variant="display">{title}</AppText>
      {subtitle ? <AppText muted>{subtitle}</AppText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm, marginBottom: spacing.lg },
  back: { marginBottom: spacing.xl },
});
