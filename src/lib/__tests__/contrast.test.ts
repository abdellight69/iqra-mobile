import { KID_TONES, KIDS } from "../kids";
import { TAJWEED_RULES } from "../tajweed";
import { palette, THEMES, type Colors } from "../palettes";

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
  // Tous les thèmes (Soutien compris), en clair et en sombre, et la palette des profils enfants.
  const themes: [string, Colors][] = [
    ...THEMES.flatMap((t): [string, Colors][] => [
      [`${t.label} clair`, t.light],
      [`${t.label} sombre`, t.dark],
    ]),
    ["Enfant (Ciel) clair", palette("eqra", false, true)],
    ["Enfant (Ciel) sombre", palette("eqra", true, true)],
  ];
  const kidsPalettes = new Set([palette("eqra", false, true), palette("eqra", true, true)]);

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
      // Carte héro : blanc chez les adultes, encre marine (KIDS.onHero) chez les enfants.
      expect(contrastRatio(kidsPalettes.has(colors) ? KIDS.onHero : "#FFFFFF", colors.hero)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrastRatio(colors.arabic, colors.background)).toBeGreaterThanOrEqual(AA_TEXT);
    });
  });
});

describe("contraste de la charte enfant « Ciel »", () => {
  const tones = Object.entries(KID_TONES);

  it.each(tones)("teinte %s : texte sur la couleur franche et sur la pastel", (_name, tone) => {
    // Boutons « tactiles » et cartes de couleur : titres ≥ 18 pt gras, mais on vise le texte courant.
    expect(contrastRatio(tone.onMain, tone.main)).toBeGreaterThanOrEqual(AA_TEXT);
    expect(contrastRatio(tone.onSoft, tone.soft)).toBeGreaterThanOrEqual(AA_TEXT);
    // Le bord (ombre tactile) sous le même texte, quand le bouton s'enfonce.
    expect(contrastRatio(tone.onMain, tone.edge)).toBeGreaterThanOrEqual(3);
  });

  it("étapes à venir (gris doux) et texte estompé sur une carte héro", () => {
    expect(contrastRatio(KIDS.neutralInk, KIDS.neutral)).toBeGreaterThanOrEqual(AA_TEXT);
    const light = palette("eqra", false, true);
    expect(contrastRatio(KIDS.sunInk, KIDS.sun)).toBeGreaterThanOrEqual(AA_TEXT);
    // Libellé de la barre d'onglets enfant (12 pt) : primaire sur sa pastel.
    expect(contrastRatio(light.primary, light.primarySoft)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});

describe("contraste des couleurs de tajwid", () => {
  const rules = Object.entries(TAJWEED_RULES);

  it.each(rules)("%s est lisible sur le papier, les cartes et le verset actif", (_key, rule) => {
    for (const { light, dark } of THEMES) {
      for (const surface of ["background", "surface"] as const) {
        expect(contrastRatio(rule.light, light[surface])).toBeGreaterThanOrEqual(AA_TEXT);
        expect(contrastRatio(rule.dark, dark[surface])).toBeGreaterThanOrEqual(AA_TEXT);
      }
      // Verset en cours de lecture (fond primarySoft) : texte arabe grand (≥ 24 pt), seuil « grand texte » 3:1 largement dépassé.
      expect(contrastRatio(rule.light, light.primarySoft)).toBeGreaterThanOrEqual(4.2);
      expect(contrastRatio(rule.dark, dark.primarySoft)).toBeGreaterThanOrEqual(4.2);
    }
  });
});
