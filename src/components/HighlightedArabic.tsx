import { Text } from "react-native";
import { useColors } from "@/lib/theme";
import { ArabicText, type ArabicTextProps } from "./ArabicText";

/** Lettre de base suivie de ses signes (voyelles, shadda, petit alif, petit wāw…). */
export function clusters(text: string): string[] {
  const out: string[] = [];
  for (const char of text) {
    if (out.length > 0 && /[\p{M}\p{Lm}]/u.test(char)) out[out.length - 1] += char;
    else out.push(char);
  }
  return out;
}

/**
 * Texte arabe dont certaines lettres sont colorées. Seule la couleur change d'un segment à
 * l'autre (Text imbriqués) : les lettres restent attachées comme dans le mot.
 */
export function HighlightedArabic({ text, highlight = [], color, ...props }: ArabicTextProps & { text: string; highlight?: string[] }) {
  const colors = useColors();
  if (highlight.length === 0) return <ArabicText {...props} color={color}>{text}</ArabicText>;
  const runs: { text: string; on: boolean }[] = [];
  for (const cluster of clusters(text)) {
    const on = highlight.includes([...cluster][0]!);
    const last = runs.at(-1);
    if (last && last.on === on) last.text += cluster;
    else runs.push({ text: cluster, on });
  }
  return (
    <ArabicText {...props} color={color}>
      {runs.map((run, i) => (
        <Text key={i} style={run.on ? { color: colors.accent } : undefined}>
          {run.text}
        </Text>
      ))}
    </ArabicText>
  );
}
