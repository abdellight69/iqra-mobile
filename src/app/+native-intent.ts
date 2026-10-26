import { redirectSystemPathTo } from "@/lib/universal-links";

/**
 * Liens ouverts par le système : un lien https://eqra.fr/… (Universal Links iOS, App Links Android)
 * est traduit en route de l'app ; un lien eqra://… passe tel quel. La logique est dans
 * `src/lib/universal-links.ts` (testée) ; ici, seulement le point d'entrée attendu par expo-router.
 */
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return redirectSystemPathTo(path);
}
