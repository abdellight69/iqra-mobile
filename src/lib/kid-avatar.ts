import { STICKERS, stickersUnlocked } from "./missions-format";

/**
 * Niveau de l'avatar d'un enfant, d'après ses autocollants (un tous les cinq étoiles) : l'anneau
 * autour de sa pastille change de couleur, puis se garnit d'étoiles, puis d'une couronne.
 */
export type AvatarLevel = {
  /** De 1 à 5. */
  level: 1 | 2 | 3 | 4 | 5;
  /** Anneau : bleu pastel, jaune, puis doré. */
  ring: "blue" | "sun" | "gold";
  /** Petites étoiles posées sur l'anneau. */
  stars: 0 | 3 | 5;
  /** Couronne : tous les autocollants. */
  crown: boolean;
};

/** Niveau selon le nombre d'autocollants (0 à 12). */
export function avatarLevel(unlocked: number): AvatarLevel {
  if (unlocked >= STICKERS.length) return { level: 5, ring: "gold", stars: 5, crown: true };
  if (unlocked >= 9) return { level: 4, ring: "gold", stars: 5, crown: false };
  if (unlocked >= 6) return { level: 3, ring: "gold", stars: 3, crown: false };
  if (unlocked >= 3) return { level: 2, ring: "sun", stars: 0, crown: false };
  return { level: 1, ring: "blue", stars: 0, crown: false };
}

/** Niveau d'après le total d'étoiles (ce que l'API renvoie). */
export function avatarLevelForStars(totalStars: number): AvatarLevel {
  return avatarLevel(stickersUnlocked(totalStars));
}
