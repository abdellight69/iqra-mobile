import { Platform, useColorScheme, type ViewStyle } from "react-native";
import { useActiveTheme } from "./appearance-store";
import { type Colors, isDarkPalette, palette } from "./palettes";

export { darkColors, isDarkPalette, lightColors, type Colors } from "./palettes";

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  serif: "Fraunces_500Medium",
  serifSemibold: "Fraunces_600SemiBold",
  serifItalic: "Fraunces_400Regular_Italic",
  arabic: "AmiriQuran_400Regular",
} as const;

/** Palette du thème choisi (Réglages > Apparence), en clair ou en sombre selon le téléphone ou le choix. */
export function useColors(): Colors {
  const theme = useActiveTheme();
  return palette(theme, useColorScheme() === "dark");
}

/** Ombre très douce en mode clair ; en mode sombre, une bordure fine remplace l'ombre. */
export function elevation(colors: Colors, level: 1 | 2 = 1): ViewStyle {
  if (isDarkPalette(colors)) return { borderWidth: 1, borderColor: colors.border };
  return Platform.select<ViewStyle>({
    web: { boxShadow: level === 1 ? "0 6px 24px rgba(27,26,23,0.06)" : "0 12px 36px rgba(27,26,23,0.10)" },
    default: {
      shadowColor: colors.shadow,
      shadowOpacity: level === 1 ? 0.06 : 0.1,
      shadowRadius: level === 1 ? 18 : 28,
      shadowOffset: { width: 0, height: level === 1 ? 6 : 12 },
      elevation: level === 1 ? 2 : 6,
    },
  }) as ViewStyle;
}
