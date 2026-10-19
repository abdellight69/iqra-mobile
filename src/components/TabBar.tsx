import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useKidsMode } from "@/lib/kids";
import { elevation, radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";

type IconName = ComponentProps<typeof Ionicons>["name"];
export const TAB_ICONS: Record<string, [IconName, IconName]> = {
  index: ["home-outline", "home"],
  quran: ["book-outline", "book"],
  memorize: ["repeat-outline", "repeat"],
  learn: ["sparkles-outline", "sparkles"],
  profile: ["person-outline", "person"],
};

/** Barre d'onglets flottante : une pastille, l'onglet actif mis en avant avec son libellé. */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const colors = useColors();
  // Mode enfant : chaque onglet garde son libellé, les cibles sont plus grandes.
  const kids = useKidsMode();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md), backgroundColor: colors.background }]}>
      <View style={[styles.bar, { backgroundColor: colors.surface }, elevation(colors, 2)]}>
        {state.routes.map((route, index) => {
          const focused = index === state.index;
          const options = descriptors[route.key]?.options;
          const title = typeof options?.title === "string" ? options.title : route.name;
          // Mode enfant : cinq libellés côte à côte, « Mémoriser » ne tient pas.
          const label = kids && route.name === "memorize" ? "Réciter" : title;
          const [icon, activeIcon] = TAB_ICONS[route.name] ?? ["ellipse-outline", "ellipse"];
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                const event = emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  void Haptics.selectionAsync();
                  navigateToTab(route.key);
                }
              }}
              style={[styles.item, kids && styles.itemKids, focused && { backgroundColor: colors.primarySoft, flexGrow: kids ? 1 : 2.3 }]}>
              <Ionicons name={focused ? activeIcon : icon} size={kids ? 24 : 20} color={focused ? colors.primary : colors.textMuted} />
              {focused || kids ? (
                <AppText variant="caption" color={focused ? colors.primary : colors.textMuted} numberOfLines={1} style={styles.label}>
                  {label}
                </AppText>
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  bar: { flexDirection: "row", borderRadius: radius.pill, padding: 6, gap: 4 },
  item: {
    flexGrow: 1,
    flexBasis: 0,
    height: 46,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  itemKids: { height: 58, flexDirection: "column", gap: 2 },
  label: { fontWeight: "600" },
});
