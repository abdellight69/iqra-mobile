import { createAudioPlayer, type AudioPlayer, type AudioSource } from "expo-audio";
import { createKidToggle } from "./kid-settings";

/**
 * Petits sons de l'interface enfant : un « tap » discret, une réussite (deux notes montantes) et
 * une étoile gagnée (arpège). Ils se superposent à la récitation sans la couper (pas de
 * `claimPlayback`) : un lecteur par son, gardé en mémoire, rejoué depuis le début. Un parent peut
 * les couper dans la gestion des profils.
 */
export const useKidsSounds = createKidToggle("iqra.kidsSounds");

export type KidSound = "tap" | "success" | "star";

const SOURCES: Record<KidSound, AudioSource> = {
  tap: require("../../assets/sounds/tap.wav"),
  success: require("../../assets/sounds/success.wav"),
  star: require("../../assets/sounds/star.wav"),
};

const players: Partial<Record<KidSound, AudioPlayer>> = {};

function player(name: KidSound): AudioPlayer {
  return (players[name] ??= createAudioPlayer(SOURCES[name]));
}

/** Joue un son (depuis le début, même s'il est déjà en cours). Rien quand les sons sont coupés. */
export function playKidSound(name: KidSound): void {
  if (!useKidsSounds.getState().enabled) return;
  try {
    const p = player(name);
    void p.seekTo(0).then(() => p.play());
  } catch {
    // Audio indisponible (navigateur sans interaction préalable…) : le son est facultatif.
  }
}
