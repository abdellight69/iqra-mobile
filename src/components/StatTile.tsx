import { StyleSheet, View } from "react-native";
import { AppText } from "./AppText";

/** Chiffre clé : grand nombre serif et légende discrète, sans encadré. */
export function StatTile({ value, label, color }: { value: string | number; label: string; color?: string }) {
  return (
    <View style={styles.tile}>
      <AppText variant="title" color={color}>
        {value}
      </AppText>
      <AppText variant="caption" muted numberOfLines={2}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({ tile: { flex: 1, gap: 2 } });
