import { useEffect, useState } from "react";
import { Animated, Pressable, StyleSheet, View } from "react-native";
import { useReducedMotion } from "@/lib/a11y";
import { darkColors, radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

/**
 * Sélecteur d'onglets en pastilles : la pastille claire glisse sous l'onglet choisi
 * (instantanément si « Réduire les animations » est activé).
 */
export function SegmentedTabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
}) {
  const colors = useColors();
  // En sombre, une pastille claire sur fond sombre ne se distinguerait pas : elle passe au vert.
  const dark = colors === darkColors;
  const pillColor = dark ? colors.primary : colors.surface;
  const selectedText = dark ? colors.onPrimary : colors.text;
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const index = Math.max(0, tabs.findIndex((t) => t.id === value));
  const [position] = useState(() => new Animated.Value(index));
  const segment = width > 0 ? (width - PADDING * 2) / tabs.length : 0;

  useEffect(() => {
    if (reduced) {
      position.setValue(index);
      return;
    }
    Animated.spring(position, { toValue: index, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  }, [index, reduced, position]);

  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { backgroundColor: colors.surfaceMuted }]}>
      {segment > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              width: segment,
              backgroundColor: pillColor,
              shadowColor: colors.shadow,
              transform: [{ translateX: position.interpolate({ inputRange: [0, 1], outputRange: [0, segment] }) }],
            },
          ]}
        />
      ) : null}
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.id)}
            style={styles.tab}>
            <AppText variant="bodyStrong" color={selected ? selectedText : colors.textMuted} numberOfLines={1}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const PADDING = 4;

const styles = StyleSheet.create({
  track: { flexDirection: "row", borderRadius: radius.pill, padding: PADDING },
  pill: {
    position: "absolute",
    top: PADDING,
    bottom: PADDING,
    left: PADDING,
    borderRadius: radius.pill,
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  tab: { flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", paddingHorizontal: spacing.sm },
});
