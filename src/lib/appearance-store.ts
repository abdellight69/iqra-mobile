import * as SecureStore from "expo-secure-store";
import { Appearance, Platform } from "react-native";
import { create } from "zustand";

/**
 * Apparence choisie dans Réglages : suivre le téléphone, ou forcer le thème clair ou sombre.
 * Le choix est appliqué à toute l'app via `Appearance.setColorScheme`, donc `useColorScheme()`
 * (couleurs, barre d'onglets, tajwid, alertes et clavier natifs) le respecte partout.
 */
export type AppearanceMode = "system" | "light" | "dark";

const KEY = "iqra.appearance";
const isWeb = Platform.OS === "web";
const MODES: readonly AppearanceMode[] = ["system", "light", "dark"];

type AppearanceState = { mode: AppearanceMode; setMode: (mode: AppearanceMode) => void };

export function sanitizeAppearanceMode(raw: unknown): AppearanceMode | null {
  return typeof raw === "string" && (MODES as readonly string[]).includes(raw) ? (raw as AppearanceMode) : null;
}

function apply(mode: AppearanceMode) {
  // Le web suit toujours le navigateur (pas de module natif Appearance).
  if (isWeb) return;
  Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
}

async function loadMode(): Promise<AppearanceMode | null> {
  try {
    const raw = isWeb ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return sanitizeAppearanceMode(raw);
  } catch {
    return null;
  }
}

async function saveMode(mode: AppearanceMode): Promise<void> {
  try {
    if (isWeb) globalThis.localStorage?.setItem(KEY, mode);
    else await SecureStore.setItemAsync(KEY, mode);
  } catch {
    // Stockage indisponible : le choix reste valable pour la session en cours.
  }
}

export const useAppearance = create<AppearanceState>((set) => ({
  mode: "system",
  setMode: (mode) => {
    apply(mode);
    set({ mode });
    void saveMode(mode);
  },
}));

// Relecture du choix au démarrage de l'app (le module est importé par le layout racine).
void loadMode().then((saved) => {
  if (!saved || saved === useAppearance.getState().mode) return;
  apply(saved);
  useAppearance.setState({ mode: saved });
});
