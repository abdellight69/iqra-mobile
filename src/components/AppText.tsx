import { Text, type TextProps, type TextStyle } from "react-native";
import { useKidsTheme } from "@/lib/appearance-store";
import { fonts, useColors } from "@/lib/theme";

type Variant = "display" | "title" | "headline" | "heading" | "body" | "bodyStrong" | "caption" | "label" | "serifBody";

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.serifSemibold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  title: { fontFamily: fonts.serifSemibold, fontSize: 25, lineHeight: 31, letterSpacing: -0.4 },
  headline: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: "uppercase" },
  serifBody: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 25 },
};

/** Profil enfant : police ronde (Nunito), plus grasse et plus grande, sans majuscules forcées. */
const kidsVariants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.kidsBlack, fontSize: 34, lineHeight: 40 },
  title: { fontFamily: fonts.kidsBlack, fontSize: 27, lineHeight: 33 },
  headline: { fontFamily: fonts.kidsHeavy, fontSize: 21, lineHeight: 27 },
  heading: { fontFamily: fonts.kidsHeavy, fontSize: 18, lineHeight: 24 },
  body: { fontFamily: fonts.kidsRegular, fontSize: 17, lineHeight: 25 },
  bodyStrong: { fontFamily: fonts.kidsBold, fontSize: 17, lineHeight: 24 },
  caption: { fontFamily: fonts.kidsRegular, fontSize: 15, lineHeight: 21 },
  label: { fontFamily: fonts.kidsHeavy, fontSize: 13, lineHeight: 17, letterSpacing: 1, textTransform: "uppercase" },
  serifBody: { fontFamily: fonts.kidsBold, fontSize: 18, lineHeight: 26 },
};

/**
 * Plafond d'agrandissement (réglage « Taille du texte » d'iOS / Android) : les grands titres
 * grossissent moins pour ne pas déborder, le texte courant jusqu'à 2×.
 */
const maxScale: Record<Variant, number> = {
  display: 1.4,
  title: 1.5,
  headline: 1.6,
  heading: 1.8,
  body: 2,
  bodyStrong: 2,
  caption: 2,
  label: 2,
  serifBody: 1.8,
};

export type AppTextProps = TextProps & { variant?: Variant; muted?: boolean; faint?: boolean; color?: string; center?: boolean; italic?: boolean };

export function AppText({ variant = "body", muted, faint, color, center, italic, style, ...props }: AppTextProps) {
  const colors = useColors();
  const kids = useKidsTheme();
  return (
    <Text
      maxFontSizeMultiplier={maxScale[variant]}
      {...props}
      style={[
        kids ? kidsVariants[variant] : variants[variant],
        italic && !kids && { fontFamily: fonts.serifItalic },
        { color: color ?? (faint ? colors.textFaint : muted ? colors.textMuted : colors.text) },
        center && { textAlign: "center" },
        style,
      ]}
    />
  );
}
