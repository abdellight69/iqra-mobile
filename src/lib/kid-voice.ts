import { useFocusEffect } from "expo-router";
import * as Speech from "expo-speech";
import { useCallback } from "react";
import { claimPlayback, releasePlayback } from "./audio";
import { createKidToggle } from "./kid-settings";

/**
 * Voix des consignes pour un enfant qui ne lit pas encore : chaque écran enfant lit sa consigne
 * à voix haute (synthèse vocale du téléphone, en français) quand il s'ouvre, et un petit bouton
 * la relit. Un parent peut la couper dans la gestion des profils.
 */
export const useKidsVoice = createKidToggle("iqra.kidsVoice");

const owner = Symbol("kid-voice");

/** Arrête la consigne en cours (écran quitté, nouvelle consigne). */
export function stopSpeaking(): void {
  releasePlayback(owner);
  try {
    void Speech.stop();
  } catch {
    // Synthèse vocale indisponible.
  }
}

/**
 * Lit une consigne à voix haute, en interrompant la précédente : deux consignes ne se lisent
 * jamais en même temps, et la récitation en cours se met en pause le temps de la consigne.
 * Rien quand un parent a coupé la voix ou quand le texte est vide.
 */
export function speak(text: string): void {
  if (!useKidsVoice.getState().enabled) return;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return;
  try {
    void Speech.stop();
    claimPlayback(owner, stopSpeaking);
    Speech.speak(clean, {
      language: "fr-FR",
      rate: 0.95,
      onDone: () => releasePlayback(owner),
      onStopped: () => releasePlayback(owner),
      onError: () => releasePlayback(owner),
    });
  } catch {
    // Synthèse vocale indisponible (navigateur sans voix…) : la consigne reste à l'écran.
  }
}

/** Dépendances d'une consigne : des valeurs simples, comparées par leur contenu. */
export type VoiceDeps = readonly (string | number | boolean | null | undefined)[];

/**
 * Lit `text` quand l'écran prend le focus (et à chaque changement de `deps`), s'arrête quand il
 * le perd ; `replay()` la relit à la demande. `enabled` sert à cacher le bouton quand la voix est coupée.
 */
export function useKidVoice(text: string, deps: VoiceDeps = [text]): { enabled: boolean; replay: () => void } {
  const enabled = useKidsVoice((s) => s.enabled);
  // Les dépendances, en une clé : la consigne n'est relue que quand l'une d'elles change.
  const key = JSON.stringify(deps);
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      speak(text);
      return stopSpeaking;
      // eslint-disable-next-line react-hooks/exhaustive-deps -- `deps` (via `key`) décide quand relire, le texte par défaut
    }, [enabled, key]),
  );
  const replay = useCallback(() => speak(text), [text]);
  return { enabled, replay };
}
