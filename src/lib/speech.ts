/**
 * Prononciation d'un mot par la voix de synthèse arabe du système (expo-speech), quand aucun
 * enregistrement récité n'existe pour lui. Le module natif peut manquer dans un ancien build
 * (dev client compilé avant son ajout) : on le charge à la demande et on s'en passe sinon.
 */
import { requireOptionalNativeModule } from "expo-modules-core";

type SpeechModule = {
  speak: (text: string, options?: { language?: string; rate?: number; onDone?: () => void; onStopped?: () => void; onError?: () => void }) => void;
  stop: () => Promise<void>;
};

let speech: SpeechModule | null | undefined;

function load(): SpeechModule | null {
  if (speech !== undefined) return speech;
  // Vérifie la présence du module natif avant d'importer le paquet : son import lance une erreur
  // (affichée en rouge en développement) quand le build ne le contient pas.
  if (!requireOptionalNativeModule("ExpoSpeech")) {
    speech = null;
    return speech;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    speech = require("expo-speech") as SpeechModule;
  } catch {
    speech = null;
  }
  return speech;
}

/** Vrai si la synthèse vocale est disponible dans ce build. */
export function canSpeak(): boolean {
  return load() !== null;
}

/** Lit le texte arabe (sans les séparateurs « / », virgules) ; `onEnd` à la fin ou à l'arrêt. */
export function speakArabic(text: string, onEnd?: () => void): boolean {
  const module = load();
  if (!module) return false;
  const spoken = text.replace(/[/|،,]/g, "،");
  module.speak(spoken, { language: "ar", rate: 0.85, onDone: onEnd, onStopped: onEnd, onError: onEnd });
  return true;
}

export function stopSpeaking(): void {
  void load()?.stop();
}
