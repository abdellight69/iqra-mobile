import { Text, type TextProps, type TextStyle } from "react-native";
import { fonts, useColors } from "@/lib/theme";

type Variant = "display" | "title" | "heading" | "body" | "bodyStrong" | "caption" | "label";

const variants: Record<Variant, TextStyle> = {
  display: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 36, letterSpacing: -0.5 },
  title: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  heading: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  bodyStrong: { fontFamily: fonts.semibold, fontSize: 15, lineHeight: 22 },
  caption: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18 },
  label: { fontFamily: fonts.semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.6, textTransform: "uppercase" },
};

export type AppTextProps = TextProps & { variant?: Variant; muted?: boolean; color?: string; center?: boolean };

export function AppText({ variant = "body", muted, color, center, style, ...props }: AppTextProps) {
  const colors = useColors();
  return (
    <Text
      {...props}
      style={[
        variants[variant],
        { color: color ?? (muted ? colors.textMuted : colors.text) },
        center && { textAlign: "center" },
        style,
      ]}
    />
  );
}
