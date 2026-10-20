import * as SecureStore from "expo-secure-store";
import { Appearance, Platform } from "react-native";
import { create } from "zustand";
import { useAuth } from "./auth-store";
import { availableTheme, sanitizeThemeId, type ThemeId } from "./palettes";

/**
 * Apparence choisie dans Réglages : suivre le téléphone, ou forcer le thème clair ou sombre.
 * Le choix est appliqué à toute l'app via `Appearance.setColorScheme`, donc `useColorScheme()`
 * (couleurs, barre d'onglets, tajwid, alertes et clavier natifs) le respecte partout.
 *
 * S'y ajoute le thème de couleurs (palettes.ts). Les thèmes « Soutien » ne s'appliquent que si le
 * compte est abonné : l'état est retenu sur l'appareil pour rester valable hors connexion.
 */
export type AppearanceMode = "system" | "light" | "dark";

const KEY = "iqra.appearance";
const THEME_KEY = "iqra.theme";
const SUPPORTER_KEY = "iqra.supporter";
const isWeb = Platform.OS === "web";
const MODES: readonly AppearanceMode[] = ["system", "light", "dark"];

type AppearanceState = {
  mode: AppearanceMode;
  /** Thème choisi, gardé même si l'abonnement s'arrête (il revient avec un nouvel abonnement). */
  theme: ThemeId;
  supporter: boolean;
  setMode: (mode: AppearanceMode) => void;
  setTheme: (theme: ThemeId) => void;
};

export function sanitizeAppearanceMode(raw: unknown): AppearanceMode | null {
  return typeof raw === "string" && (MODES as readonly string[]).includes(raw) ? (raw as AppearanceMode) : null;
}

function apply(mode: AppearanceMode) {
  // Le web suit toujours le navigateur (pas de module natif Appearance).
  if (isWeb) return;
  Appearance.setColorScheme(mode === "system" ? "unspecified" : mode);
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
    // Stockage indisponible : le choix reste valable pour la session en cours.
  }
}

export const useAppearance = create<AppearanceState>((set) => ({
  mode: "system",
  theme: "eqra",
  supporter: false,
  setMode: (mode) => {
    apply(mode);
    set({ mode });
    void save(KEY, mode);
  },
  setTheme: (theme) => {
    set({ theme });
    void save(THEME_KEY, theme);
  },
}));

/** Thème appliqué à l'app (le thème par défaut si le thème choisi est réservé au Soutien). */
export function useActiveTheme(): ThemeId {
  return useAppearance((s) => availableTheme(s.theme, s.supporter));
}

function setSupporter(supporter: boolean) {
  if (supporter === useAppearance.getState().supporter) return;
  useAppearance.setState({ supporter });
  void save(SUPPORTER_KEY, supporter ? "1" : "0");
}

// L'abonnement suit le compte connecté : relu à chaque mise à jour de l'utilisateur (/me, connexion,
// changement de profil), oublié à la déconnexion. Un serveur plus ancien (sans le champ) n'en a pas.
useAuth.subscribe((state, previous) => {
  if (state.status === "signedOut") setSupporter(false);
  else if (state.user && state.user !== previous.user) setSupporter(state.user.supporter === true);
});

// Relecture des choix au démarrage de l'app (le module est importé par le layout racine).
void Promise.all([load(KEY), load(THEME_KEY), load(SUPPORTER_KEY)]).then(([mode, theme, supporter]) => {
  const saved = sanitizeAppearanceMode(mode);
  if (saved && saved !== useAppearance.getState().mode) {
    apply(saved);
    useAppearance.setState({ mode: saved });
  }
  const savedTheme = sanitizeThemeId(theme);
  if (savedTheme) useAppearance.setState({ theme: savedTheme });
  // Un utilisateur déjà relu depuis le serveur fait foi.
  if (supporter === "1" && !useAuth.getState().user) useAppearance.setState({ supporter: true });
});
