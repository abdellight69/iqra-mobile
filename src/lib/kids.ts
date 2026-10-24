import { API_URL } from "./api";
import { useMe } from "./queries";
import { isDarkPalette, useColors } from "./theme";

/**
 * Mode enfant : le profil courant est marqué « profil enfant » par le titulaire. L'app cache
 * alors les réglages et la gestion du compte, affiche une barre d'onglets plus grande avec
 * ses libellés, allège l'accueil et raccourcit les séances.
 */
export function useKidsMode(): boolean {
  return useMe().data?.isChild === true;
}

/** Image d'un mot du lexique (servie par l'API), prête pour expo-image ; null sans image. */
export function wordImage(word: { imageUrl: string | null }): { uri: string } | null {
  return word.imageUrl ? { uri: `${API_URL}${word.imageUrl}` } : null;
}

/** Versets au plus par séance de révision pour un enfant. */
export const KIDS_MAX_DUE_VERSES = 5;
/** Exercices au plus dans une séance de mots pour un enfant (les reprises des erreurs s'y ajoutent). */
export const KIDS_MAX_EXERCISES = 12;

/** Encre marine de la charte « Ciel » : lisible sur toutes les teintes franches (contraste ≥ 5:1). */
export const KIDS_INK = "#1E2A4A";

/**
 * Teintes de l'interface enfant « Ciel » : chacune a sa couleur franche (`main`), son bord
 * (`edge`, l'ombre portée des boutons « tactiles ») et sa pastel (`soft`) avec le texte qui
 * se pose dessus (`onSoft`). Sur une teinte franche, le texte est `onMain` : l'encre marine, car
 * le blanc n'atteint pas 3:1 sur ces couleurs vives (vérifié par `contrast.test.ts`).
 */
export type KidTone = "sun" | "green" | "orange" | "blue" | "violet" | "pink";
export const KID_TONES: Record<KidTone, { main: string; edge: string; soft: string; onSoft: string; onMain: string }> = {
  sun: { main: "#FFC531", edge: "#D9A200", soft: "#FFF3CC", onSoft: "#7A5200", onMain: KIDS_INK },
  green: { main: "#16B07E", edge: "#0E8F65", soft: "#DDF6EE", onSoft: "#0E6B4E", onMain: KIDS_INK },
  orange: { main: "#FF8A3D", edge: "#D96A22", soft: "#FFEAD9", onSoft: "#9A4A12", onMain: KIDS_INK },
  blue: { main: "#4C9BFF", edge: "#2F7BDB", soft: "#E3EEFF", onSoft: "#1F4F8F", onMain: KIDS_INK },
  violet: { main: "#A58BFF", edge: "#7A5CE8", soft: "#ECE6FF", onSoft: "#4B3A9E", onMain: KIDS_INK },
  pink: { main: "#FF6FA3", edge: "#D94F82", soft: "#FFE4EE", onSoft: "#9E2F5C", onMain: KIDS_INK },
};

/** Pastels du mode sombre : la même teinte, profonde, sous le texte clair du thème. */
const DARK_SOFT: Record<KidTone, string> = { sun: "#3A2F0A", green: "#0F3328", orange: "#3D2212", blue: "#15294A", violet: "#241C4A", pink: "#3B1A2A" };

/** Couleurs enfant les plus utilisées, identiques en clair et en sombre. */
export const KIDS = {
  /** Jaune des étoiles et des boutons « bravo » ; le texte posé dessus est `sunInk`. */
  sun: KID_TONES.sun.main,
  sunSoft: KID_TONES.sun.soft,
  sunStroke: KID_TONES.sun.edge,
  sunInk: KID_TONES.sun.onMain,
  /** Texte posé sur une carte de couleur franche (`colors.hero` ou une teinte) : l'encre marine. */
  onHero: KIDS_INK,
  /** Texte secondaire sur une carte de couleur franche (même encre, légèrement estompée). */
  onHeroMuted: "#1E2A4ACC",
  /** Voile clair posé sur une teinte franche (pastille de compte, fond d'icône). */
  veil: "rgba(255,255,255,0.35)",
  /** Gris doux des étapes à venir (fond, bord, pictogramme). */
  neutral: "#EDF0F7",
  neutralEdge: "#D5DBE8",
  neutralInk: "#5B6B8C",
} as const;

/**
 * Pastels et bords selon le thème : en sombre, les pastels deviennent des teintes profondes
 * sous le texte clair du thème, et le bord des boutons blancs reprend la bordure du thème.
 */
export function useKidsColors() {
  const colors = useColors();
  const dark = isDarkPalette(colors);
  const tint = (tone: KidTone) => ({ bg: dark ? DARK_SOFT[tone] : KID_TONES[tone].soft, ink: dark ? colors.text : KID_TONES[tone].onSoft });
  const sun = tint("sun");
  return {
    sunSoft: sun.bg,
    onSunSoft: sun.ink,
    tint,
    /** Bord (ombre « tactile ») des boutons et pastilles de la couleur des surfaces. */
    edge: dark ? colors.border : KIDS.neutralEdge,
    /** Fond gris doux des éléments à venir ou désactivés. */
    neutral: dark ? colors.surfaceMuted : KIDS.neutral,
    neutralInk: dark ? colors.textFaint : KIDS.neutralInk,
  };
}
