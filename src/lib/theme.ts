import { useColorScheme } from "react-native";

const palette = {
  emerald900: "#0A3D32",
  emerald700: "#0F5F4D",
  emerald500: "#1F8A6E",
  emerald100: "#DCEFE8",
  gold500: "#D4AF37",
  gold100: "#F7EDCC",
  sand50: "#FAF7F2",
  red500: "#D64545",
  red100: "#FBE3E3",
};

export const lightColors = {
  background: palette.sand50,
  surface: "#FFFFFF",
  surfaceMuted: "#F1ECE3",
  border: "#E6DFD3",
  text: "#1C1B19",
  textMuted: "#6B675F",
  primary: palette.emerald700,
  primaryStrong: palette.emerald900,
  primarySoft: palette.emerald100,
  onPrimary: "#FFFFFF",
  accent: palette.gold500,
  accentSoft: palette.gold100,
  danger: palette.red500,
  dangerSoft: palette.red100,
  success: palette.emerald500,
  arabic: "#14231F",
};

export type Colors = typeof lightColors;

export const darkColors: Colors = {
  background: "#0D1412",
  surface: "#16201D",
  surfaceMuted: "#1E2A26",
  border: "#2A3833",
  text: "#F2EFE9",
  textMuted: "#A3AAA6",
  primary: "#3FB394",
  primaryStrong: "#7FD6BD",
  primarySoft: "#183A31",
  onPrimary: "#06231C",
  accent: palette.gold500,
  accentSoft: "#3A3218",
  danger: "#F07070",
  dangerSoft: "#3D1F1F",
  success: "#3FB394",
  arabic: "#F5F1E6",
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const radius = { sm: 8, md: 12, lg: 18, xl: 28, pill: 999 } as const;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  arabic: "AmiriQuran_400Regular",
} as const;

export function useColors(): Colors {
  return useColorScheme() === "dark" ? darkColors : lightColors;
}
