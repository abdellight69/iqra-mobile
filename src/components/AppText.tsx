import { Text, type TextProps, type TextStyle } from "react-native";
import { fonts, useColors } from "@/lib/theme";

type Variant = "display" | "title" | "headline" | "heading" | "body" | "bodyStrong" | "caption" | "label" | "serifBody";

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.serif, fontSize: 40, lineHeight: 44, letterSpacing: -0.6 },
  title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 34, letterSpacing: -0.4 },
  headline: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 26, letterSpacing: -0.2 },
  heading: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 22, letterSpacing: -0.1 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 23 },
  bodyStrong: { fontFamily: fonts.medium, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.medium, fontSize: 11, lineHeight: 14, letterSpacing: 1.4, textTransform: "uppercase" },
  serifBody: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 27 },
};

export type AppTextProps = TextProps & { variant?: Variant; muted?: boolean; faint?: boolean; color?: string; center?: boolean; italic?: boolean };

export function AppText({ variant = "body", muted, faint, color, center, italic, style, ...props }: AppTextProps) {
  const colors = useColors();
  return (
    <Text
      {...props}
      style={[
        variants[variant],
        italic && { fontFamily: fonts.serifItalic },
        { color: color ?? (faint ? colors.textFaint : muted ? colors.textMuted : colors.text) },
        center && { textAlign: "center" },
        style,
      ]}
    />
  );
}
