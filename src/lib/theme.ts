import { Platform, useColorScheme, type ViewStyle } from "react-native";

/**
 * Système de design « éditorial » : papier chaud, encre profonde, vert d'eau sombre
 * et une touche d'or discrète. Peu de bordures, beaucoup d'espace, ombres très douces.
 */
export const lightColors = {
  background: "#F7F5F0",
  surface: "#FFFFFF",
  surfaceMuted: "#EFECE5",
  border: "#E6E1D8",
  text: "#15171A",
  textMuted: "#75726B",
  textFaint: "#A9A59D",
  primary: "#0F4F44",
  primaryStrong: "#0A3A32",
  primarySoft: "#E2EDE9",
  onPrimary: "#FFFFFF",
  /** Surface de mise en avant (texte blanc dessus), dans les deux thèmes. */
  hero: "#0F4F44",
  accent: "#B08A3E",
  accentSoft: "#F3ECDC",
  danger: "#C2493D",
  dangerSoft: "#F8E5E2",
  success: "#2E8A6C",
  successSoft: "#E1F1EA",
  arabic: "#14201C",
  shadow: "#1B1A17",
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  background: "#0C0F0E",
  surface: "#151A18",
  surfaceMuted: "#1D2422",
  border: "#27302D",
  text: "#EDE9E2",
  textMuted: "#9B9F9B",
  textFaint: "#6B706C",
  primary: "#7CC4AE",
  primaryStrong: "#A8DCCB",
  primarySoft: "#16302A",
  onPrimary: "#08201A",
  hero: "#143F36",
  accent: "#D4B36E",
  accentSoft: "#2B251A",
  danger: "#E4796D",
  dangerSoft: "#3A1F1C",
  success: "#6FC6A3",
  successSoft: "#15302A",
  arabic: "#F3EEE3",
  shadow: "#000000",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const radius = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 } as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  serif: "InstrumentSerif_400Regular",
  serifItalic: "InstrumentSerif_400Regular_Italic",
  arabic: "AmiriQuran_400Regular",
} as const;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? darkColors : lightColors;
}

/** Ombre très douce en mode clair ; en mode sombre, une bordure fine remplace l'ombre. */
export function elevation(colors: Colors, level: 1 | 2 = 1): ViewStyle {
  if (colors === darkColors) return { borderWidth: 1, borderColor: colors.border };
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
