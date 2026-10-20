import * as SecureStore from "expo-secure-store";
import { useEffect, useState } from "react";
import { Platform } from "react-native";

/** Onglets de l'écran Vocabulaire. */
export const LEARN_TABS = ["sourates", "themes", "fiches"] as const;
export type LearnTab = (typeof LEARN_TABS)[number];

const isWeb = Platform.OS === "web";
const key = (profileId: string) => `iqra.learnTab.${profileId}`;

export function sanitizeLearnTab(raw: unknown): LearnTab | null {
  return typeof raw === "string" && (LEARN_TABS as readonly string[]).includes(raw) ? (raw as LearnTab) : null;
}

/** Onglet par défaut : les thèmes pour un enfant, le parcours par sourate sinon. */
export function defaultLearnTab(isChild: boolean): LearnTab {
  return isChild ? "themes" : "sourates";
}

/**
 * Onglet choisi, retenu par profil (SecureStore ; localStorage sur le web). `ready` passe à vrai
 * une fois le choix enregistré relu, pour afficher d'emblée le bon onglet.
 */
export function useLearnTab(profileId: string | undefined, isChild: boolean): { tab: LearnTab; choose: (tab: LearnTab) => void; ready: boolean } {
  const [tab, setTab] = useState<LearnTab>(defaultLearnTab(isChild));
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!profileId || loadedFor === profileId) return;
    let active = true;
    const read = async () => {
      try {
        const raw = isWeb ? globalThis.localStorage?.getItem(key(profileId)) : await SecureStore.getItemAsync(key(profileId));
        return sanitizeLearnTab(raw);
      } catch {
        return null;
      }
    };
    void read().then((saved) => {
      if (!active) return;
      setTab(saved ?? defaultLearnTab(isChild));
      setLoadedFor(profileId);
    });
    return () => {
      active = false;
    };
  }, [profileId, isChild, loadedFor]);

  const choose = (next: LearnTab) => {
    setTab(next);
    if (!profileId) return;
    try {
      if (isWeb) globalThis.localStorage?.setItem(key(profileId), next);
      else void SecureStore.setItemAsync(key(profileId), next).catch(() => undefined);
    } catch {
      // Stockage indisponible : le choix vaut pour la session en cours.
    }
  };

  return { tab, choose, ready: !!profileId && loadedFor === profileId };
}
