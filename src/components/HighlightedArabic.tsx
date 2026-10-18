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
export function HighlightedArabic({
  text,
  highlight = [],
  marks,
  color,
  ...props
}: ArabicTextProps & { text: string; highlight?: string[]; marks?: number[] }) {
  const colors = useColors();
  if (highlight.length === 0 && !marks?.length) return <ArabicText {...props} color={color}>{text}</ArabicText>;
  const runs: { text: string; on: boolean }[] = [];
  for (const [i, cluster] of clusters(text).entries()) {
    // `marks` (rangs précis) l'emporte sur `highlight` (toutes les occurrences d'une lettre).
    const on = marks?.length ? marks.includes(i) : highlight.includes([...cluster][0]!);
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
