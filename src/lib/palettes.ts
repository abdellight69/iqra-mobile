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
  /** Texte secondaire : ≥ 4.5:1 sur toutes les surfaces (WCAG AA). */
  textMuted: "#5F5C55",
  /** Texte tertiaire (sources, indices) : ≥ 4.5:1 sur le fond et les surfaces. */
  textFaint: "#6D6A63",
  primary: "#0F4F44",
  primaryStrong: "#0A3A32",
  primarySoft: "#E2EDE9",
  onPrimary: "#FFFFFF",
  /** Surface de mise en avant (texte blanc dessus), dans les deux thèmes. */
  hero: "#0F4F44",
  /** Or bronze : sert aussi de couleur de texte (phonétique), donc ≥ 4.5:1 sur le papier. */
  accent: "#85661F",
  accentSoft: "#F3ECDC",
  danger: "#B23D33",
  dangerSoft: "#F8E5E2",
  success: "#23715A",
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
  textFaint: "#8F948F",
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

/** Bleu nuit : papier légèrement froid, encre indigo, même or. */
const nightLight: Colors = {
  ...lightColors,
  background: "#F4F5F8",
  surfaceMuted: "#E9ECF2",
  border: "#DFE3EB",
  textMuted: "#585C66",
  textFaint: "#646873",
  primary: "#25386E",
  primaryStrong: "#1A2954",
  primarySoft: "#E6EBF6",
  hero: "#25386E",
  arabic: "#141A2A",
  shadow: "#171A23",
};

const nightDark: Colors = {
  ...darkColors,
  background: "#0B0D14",
  surface: "#141826",
  surfaceMuted: "#1C2132",
  border: "#283049",
  text: "#E9EAF0",
  textMuted: "#9EA3B0",
  textFaint: "#9095A3",
  primary: "#9DB3EA",
  primaryStrong: "#C3D1F3",
  primarySoft: "#1A2342",
  onPrimary: "#0A1230",
  hero: "#22315F",
  arabic: "#F0EEE8",
};

/** Terracotta : papier sable, encre terre cuite. */
const sandLight: Colors = {
  ...lightColors,
  background: "#F8F3EE",
  surfaceMuted: "#F0E7DF",
  border: "#E8DCD1",
  text: "#1A1614",
  textMuted: "#61574F",
  textFaint: "#6E635A",
  primary: "#8F3E1E",
  primaryStrong: "#6E2E15",
  primarySoft: "#F7E8E1",
  hero: "#7F3619",
  arabic: "#22150F",
  shadow: "#1E1712",
};

const sandDark: Colors = {
  ...darkColors,
  background: "#110D0B",
  surface: "#1B1512",
  surfaceMuted: "#251D19",
  border: "#362B25",
  text: "#EFE7E0",
  textMuted: "#A69C94",
  textFaint: "#998F87",
  primary: "#E8A487",
  primaryStrong: "#F3C6B2",
  primarySoft: "#3A2119",
  onPrimary: "#2A0F05",
  hero: "#5C2A15",
  arabic: "#F6EEE6",
};

export const THEME_IDS = ["eqra", "nuit", "sable"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeDefinition = {
  id: ThemeId;
  label: string;
  /** Thème offert avec l'abonnement « Soutien » (docs/soutien-v1.md). */
  supporter: boolean;
  light: Colors;
  dark: Colors;
};

export const THEMES: readonly ThemeDefinition[] = [
  { id: "eqra", label: "Vert d'eau", supporter: false, light: lightColors, dark: darkColors },
  { id: "nuit", label: "Bleu nuit", supporter: true, light: nightLight, dark: nightDark },
  { id: "sable", label: "Terracotta", supporter: true, light: sandLight, dark: sandDark },
];

export function sanitizeThemeId(raw: unknown): ThemeId | null {
  return typeof raw === "string" && (THEME_IDS as readonly string[]).includes(raw) ? (raw as ThemeId) : null;
}

/** Thème réellement appliqué : un thème Soutien choisi revient au thème par défaut quand l'abonnement s'arrête. */
export function availableTheme(chosen: ThemeId, supporter: boolean): ThemeId {
  const theme = THEMES.find((t) => t.id === chosen);
  return theme && (!theme.supporter || supporter) ? chosen : "eqra";
}

/**
 * Palette d'un profil enfant, quel que soit le thème choisi : papier crème plus chaud, même vert
 * profond, or plus lumineux. Jamais proposée dans les Réglages.
 */
/** Profils enfants, direction « Ciel » : fond bleu très pâle, encre marine, vert franc, teintes vives. */
const kidsLight: Colors = {
  ...lightColors,
  background: "#F4F7FF",
  surface: "#FFFFFF",
  surfaceMuted: "#EDF0F7",
  border: "#E3E8F3",
  text: "#1E2A4A",
  textMuted: "#5B6B8C",
  textFaint: "#5B6B8C",
  primary: "#0E8F65",
  primaryStrong: "#0B6E4E",
  primarySoft: "#DDF6EE",
  onPrimary: "#FFFFFF",
  hero: "#16B07E",
  accent: "#0B7A56",
  accentSoft: "#DDF6EE",
  danger: "#D94F82",
  dangerSoft: "#FFE4EE",
  success: "#0E8F65",
  successSoft: "#DDF6EE",
  arabic: "#1E2A4A",
  shadow: "#1E2A4A",
};

const kidsDark: Colors = {
  ...darkColors,
  background: "#0F1526",
  surface: "#171F36",
  surfaceMuted: "#1F2944",
  border: "#2B3755",
  text: "#EEF2FF",
  textMuted: "#A9B4CC",
  textFaint: "#9AA6BF",
  primary: "#4ED3A4",
  primaryStrong: "#7EE3BF",
  primarySoft: "#163B31",
  onPrimary: "#06231A",
  hero: "#13825F",
  accent: "#5FD9AD",
  accentSoft: "#163B31",
  danger: "#FF7FAE",
  dangerSoft: "#3A1F2C",
  success: "#4ED3A4",
  successSoft: "#163B31",
  arabic: "#F4F6FF",
  shadow: "#000000",
};

export function palette(theme: ThemeId, dark: boolean, kids = false): Colors {
  if (kids) return dark ? kidsDark : kidsLight;
  const definition = THEMES.find((t) => t.id === theme) ?? THEMES[0]!;
  return dark ? definition.dark : definition.light;
}

const DARK_PALETTES = new Set<Colors>([...THEMES.map((t) => t.dark), kidsDark]);

/** Palette sombre (quel que soit le thème) : sert aux réglages propres au mode sombre. */
export function isDarkPalette(colors: Colors): boolean {
  return DARK_PALETTES.has(colors);
}
