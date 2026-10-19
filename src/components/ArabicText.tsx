import { Platform, Text, type TextProps } from "react-native";
import { fonts, useColors } from "@/lib/theme";

const sizes = { sm: 20, md: 26, lg: 32, xl: 40 } as const;

export type ArabicTextProps = TextProps & { size?: keyof typeof sizes | number; color?: string; center?: boolean };

/** Agrandissement maximal du texte arabe avec la taille système : déjà grand, il déborderait au-delà. */
export const ARABIC_MAX_FONT_SCALE = 1.6;

/**
 * Texte arabe en police Amiri Quran, aligné de droite à gauche, avec un interligne généreux pour les signes.
 * Android coupe les signes qui dépassent la boîte du texte (kasra, tanwîn sous la dernière ligne,
 * shadda empilée au-dessus de la première) : on réserve une marge verticale pour eux.
 */
export function ArabicText({ size = "md", color, center, style, ...props }: ArabicTextProps) {
  const colors = useColors();
  const fontSize = typeof size === "number" ? size : sizes[size];
  return (
    <Text
      maxFontSizeMultiplier={ARABIC_MAX_FONT_SCALE}
      {...props}
      style={[
        {
          fontFamily: fonts.arabic,
          fontSize,
          lineHeight: Math.round(fontSize * 1.9),
          color: color ?? colors.arabic,
          writingDirection: "rtl",
          textAlign: center ? "center" : "right",
        },
        Platform.OS === "android" && { paddingTop: Math.round(fontSize * 0.15), paddingBottom: Math.round(fontSize * 0.35), includeFontPadding: true },
        style,
      ]}
    />
  );
}
