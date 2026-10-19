import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

/**
 * Profil choisi dans « Qui lit ? », mémorisé d'un lancement à l'autre : tant que la session
 * appartient à ce profil, le sélecteur n'est plus proposé au démarrage. Oublié à la déconnexion.
 */
const KEY = "iqra.profile";
const isWeb = Platform.OS === "web";

export async function loadRememberedProfile(): Promise<string | null> {
  try {
    const value = isWeb ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return value || null;
  } catch {
    return null;
  }
}

export async function rememberProfile(userId: string): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.setItem(KEY, userId);
    else await SecureStore.setItemAsync(KEY, userId);
  } catch {
    // Stockage indisponible : le sélecteur sera simplement proposé au prochain lancement.
  }
}

export async function forgetProfile(): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.removeItem(KEY);
    else await SecureStore.deleteItemAsync(KEY);
  } catch {
    // Rien à oublier.
  }
}
