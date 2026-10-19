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
