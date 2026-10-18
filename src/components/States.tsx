import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { errorMessage } from "@/lib/api";
import { spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";
import { Button } from "./Button";

export function LoadingState({ label }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <ActivityIndicator color={colors.primary} />
      {label ? (
        <AppText variant="caption" muted>
          {label}
        </AppText>
      ) : null}
    </View>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const colors = useColors();
  return (
    <View style={[styles.center, { backgroundColor: colors.background }]}>
      <Ionicons name="cloud-offline-outline" size={32} color={colors.textFaint} />
      <AppText center muted style={styles.message}>
        {errorMessage(error)}
      </AppText>
      {onRetry ? <Button title="Réessayer" variant="secondary" size="md" onPress={onRetry} /> : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ComponentProps<typeof Ionicons>["name"];
  title: string;
  message?: string;
  action?: { title: string; onPress: () => void };
}) {
  const colors = useColors();
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={30} color={colors.accent} />
      <AppText variant="headline" center>
        {title}
      </AppText>
      {message ? (
        <AppText center muted style={styles.message}>
          {message}
        </AppText>
      ) : null}
      {action ? <Button title={action.title} onPress={action.onPress} size="md" style={{ marginTop: spacing.sm }} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xxl },
  message: { maxWidth: 300 },
});
