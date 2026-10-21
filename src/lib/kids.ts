import { useMe } from "./queries";

/**
 * Mode enfant : le profil courant est marqué « profil enfant » par le titulaire. L'app cache
 * alors les réglages et la gestion du compte, affiche une barre d'onglets plus grande avec
 * ses libellés, allège l'accueil et raccourcit les séances.
 */
export function useKidsMode(): boolean {
  return useMe().data?.isChild === true;
}

/** Versets au plus par séance de révision pour un enfant. */
export const KIDS_MAX_DUE_VERSES = 5;

/** Couleurs de l'interface enfant, ajoutées au thème de l'app (lisibles en clair comme en sombre). */
export const KIDS = {
  /** Jaune soleil des étoiles et des grands boutons ; le texte posé dessus est `sunInk`. */
  sun: "#FFC93C",
  sunSoft: "#FFF1CC",
  sunStroke: "#C98A00",
  sunInk: "#1F2A27",
} as const;
