/** Tirage dans [0, 1[ : Math.random par défaut, remplaçable par une suite déterministe en test. */
export type Random = () => number;

/** Mélange de Fisher-Yates (copie, l'original n'est pas modifié). */
export function shuffle<T>(items: readonly T[], random: Random = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

/**
 * Deux colonnes du jeu d'association, mélangées indépendamment : aucune paire n'est en face de
 * son vis-à-vis (dérangement), pour que la bonne réponse ne soit jamais « juste à côté ».
 * Avec un seul élément, la colonne de droite reste forcément alignée.
 */
export function shufflePairs<T>(items: readonly T[], random: Random = Math.random): { left: T[]; right: T[] } {
  const left = shuffle(items, random);
  if (items.length < 2) return { left, right: [...left] };
  for (let attempt = 0; attempt < 20; attempt++) {
    const right = shuffle(left, random);
    if (right.every((item, i) => item !== left[i])) return { left, right };
  }
  // Repli déterministe : décalage circulaire d'un cran, jamais aligné.
  return { left, right: [...left.slice(1), left[0]!] };
}
