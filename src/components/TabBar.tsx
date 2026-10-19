import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { BottomTabBarHeightCallbackContext, type BottomTabBarProps } from "expo-router/js-tabs";
import { useContext, type ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, useColorScheme, View } from "react-native";
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

/**
 * Flou progressif : plusieurs couches de flou, de plus en plus courtes vers le bas, pour que le
 * contenu passe du net au flou sans bord franc ; un dégradé vers la couleur de fond adoucit le tout.
 */
const BLUR_LAYERS = [1, 0.78, 0.56, 0.34] as const;

/**
 * Barre d'onglets flottante : une pastille, l'onglet actif mis en avant avec son libellé.
 * Elle se superpose au contenu, qui défile en flou derrière elle ; sa hauteur est publiée aux
 * écrans (useBottomTabBarHeight / BottomTabBarHeightContext) pour qu'ils gardent la place en bas.
 */
export function TabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const colors = useColors();
  const dark = useColorScheme() === "dark";
  const reportHeight = useContext(BottomTabBarHeightCallbackContext);
  // Mode enfant : chaque onglet garde son libellé, les cibles sont plus grandes.
  const kids = useKidsMode();
  return (
    <View
      pointerEvents="box-none"
      onLayout={(e) => reportHeight?.(e.nativeEvent.layout.height)}
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
      {BLUR_LAYERS.map((height) => (
        <BlurView
          key={height}
          pointerEvents="none"
          intensity={dark ? 14 : 18}
          tint={dark ? "systemChromeMaterialDark" : "systemChromeMaterialLight"}
          blurMethod={Platform.OS === "android" ? "dimezisBlurView" : undefined}
          style={[styles.blur, { height: `${Math.round(height * 100)}%` }]}
        />
      ))}
      <LinearGradient
        pointerEvents="none"
        colors={["transparent", `${colors.background}99`, `${colors.background}E6`]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
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
                <AppText variant="caption" color={focused ? colors.primary : colors.textMuted} numberOfLines={1} maxFontSizeMultiplier={1.3} style={styles.label}>
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
  wrap: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.xl + spacing.sm, overflow: "hidden" },
  blur: { position: "absolute", left: 0, right: 0, bottom: 0 },
  bar: { flexDirection: "row", borderRadius: radius.pill, padding: 6, gap: 4 },
  item: {
    flexGrow: 1,
    flexBasis: 0,
    minHeight: 46,
    paddingVertical: 4,
    borderRadius: radius.pill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  itemKids: { minHeight: 58, flexDirection: "column", gap: 2 },
  label: { fontWeight: "600" },
});
