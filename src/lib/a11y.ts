import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * Réglage système « Réduire les animations » (iOS : Accessibilité > Mouvement ; Android : supprimer les animations).
 * Les transitions natives le respectent déjà ; ce hook sert aux animations pilotées par l'app
 * (défilement automatique vers le verset récité, feuilles modales).
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((value) => {
        if (active) setReduced(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);
  return reduced;
}
