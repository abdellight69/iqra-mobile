import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { create } from "zustand";

/**
 * Réglage « pour les enfants » gardé sur l'appareil (SecureStore ; localStorage sur le web), choisi
 * par un parent dans la gestion des profils : "1" actif, "0" inactif, actif par défaut. Chaque
 * réglage (voix des consignes, petits sons) est un magasin partagé par toute l'app.
 */
const isWeb = Platform.OS === "web";

export type KidToggle = { enabled: boolean; setEnabled: (enabled: boolean) => void };

/** Relecture d'une valeur enregistrée : seul "0" désactive, tout le reste vaut « actif ». */
export function parseToggle(raw: string | null | undefined): boolean {
  return raw !== "0";
}

async function load(key: string): Promise<string | null> {
  try {
    return (isWeb ? globalThis.localStorage?.getItem(key) : await SecureStore.getItemAsync(key)) ?? null;
  } catch {
    return null;
  }
}

async function save(key: string, value: string): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.setItem(key, value);
    else await SecureStore.setItemAsync(key, value);
  } catch {
    // Stockage indisponible : le choix vaut pour la session en cours.
  }
}

/** Un magasin par réglage, relu au chargement du module et écrit à chaque changement. */
export function createKidToggle(key: string) {
  const store = create<KidToggle>((set) => ({
    enabled: true,
    setEnabled: (enabled) => {
      set({ enabled });
      void save(key, enabled ? "1" : "0");
    },
  }));
  void load(key).then((raw) => {
    const enabled = parseToggle(raw);
    if (enabled !== store.getState().enabled) store.setState({ enabled });
  });
  return store;
}
