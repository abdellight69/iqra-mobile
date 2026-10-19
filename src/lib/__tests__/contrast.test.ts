import { TAJWEED_RULES } from "../tajweed";
import { darkColors, lightColors, type Colors } from "../theme";

/** Luminance relative (WCAG 2.x) d'une couleur #RRGGBB. */
function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const channel = parseInt(hex.slice(i, i + 2), 16) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

const AA_TEXT = 4.5;

describe("contraste des couleurs du thème (WCAG AA, texte courant ≥ 4.5:1)", () => {
  const themes: [string, Colors][] = [
    ["clair", lightColors],
    ["sombre", darkColors],
  ];

  describe.each(themes)("thème %s", (_name, colors) => {
    const surfaces = ["background", "surface", "surfaceMuted"] as const;

    it.each(surfaces)("text, textMuted et textFaint sur %s", (surface) => {
      for (const key of ["text", "textMuted", "textFaint"] as const) {
        expect(contrastRatio(colors[key], colors[surface])).toBeGreaterThanOrEqual(AA_TEXT);
      }
    });

    it("textMuted sur les surfaces teintées (cartes accent, verset actif)", () => {
      for (const surface of ["primarySoft", "accentSoft", "successSoft", "dangerSoft"] as const) {
        expect(contrastRatio(colors.textMuted, colors[surface])).toBeGreaterThanOrEqual(AA_TEXT);
      }
    });

    it("couleurs d'accent utilisées comme texte (phonétique, erreurs, réussites)", () => {
      for (const surface of ["background", "surface"] as const) {
        expect(contrastRatio(colors.accent, colors[surface])).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrastRatio(colors.danger, colors[surface])).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrastRatio(colors.success, colors[surface])).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrastRatio(colors.primary, colors[surface])).toBeGreaterThanOrEqual(AA_TEXT);
      }
      // Mot « différent » (accent sur accentSoft), bouton danger (danger sur dangerSoft).
      expect(contrastRatio(colors.accent, colors.accentSoft)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(colors.danger, colors.dangerSoft)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(colors.success, colors.successSoft)).toBeGreaterThanOrEqual(AA_TEXT);
    });

    it("texte sur les boutons et surfaces pleines", () => {
      expect(contrastRatio(colors.onPrimary, colors.primary)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio("#FFFFFF", colors.hero)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(colors.arabic, colors.background)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  });
});

describe("contraste des couleurs de tajwid", () => {
  const rules = Object.entries(TAJWEED_RULES);

  it.each(rules)("%s est lisible sur le papier, les cartes et le verset actif", (_key, rule) => {
    for (const surface of ["background", "surface"] as const) {
      expect(contrastRatio(rule.light, lightColors[surface])).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(rule.dark, darkColors[surface])).toBeGreaterThanOrEqual(AA_TEXT);
    }
    // Verset en cours de lecture (fond primarySoft) : texte arabe grand (≥ 24 pt), seuil « grand texte » 3:1 largement dépassé.
    expect(contrastRatio(rule.light, lightColors.primarySoft)).toBeGreaterThanOrEqual(4.2);
    expect(contrastRatio(rule.dark, darkColors.primarySoft)).toBeGreaterThanOrEqual(4.2);
  });
});
