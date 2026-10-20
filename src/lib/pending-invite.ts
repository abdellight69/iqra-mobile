import { Linking } from "react-native";
import { parseJoinInput } from "./families-format";

/**
 * Lien d'invitation à une famille ouvert avant la connexion : l'écran « Rejoindre » est réservé aux
 * comptes connectés, donc on garde le lien (en mémoire, le temps de la session) pour l'ouvrir juste
 * après la connexion ou l'inscription.
 */
let pending: { t?: string; c?: string } | null = null;

export function rememberInvite(url: string | null | undefined) {
  if (!url || !url.includes("famille/rejoindre")) return;
  const parsed = parseJoinInput(url);
  if (!parsed) return;
  pending = "token" in parsed ? { t: parsed.token } : { c: parsed.code };
}

/** Lien gardé (une seule fois). */
export function takePendingInvite(): { t?: string; c?: string } | null {
  const value = pending;
  pending = null;
  return value;
}

/** À appeler hors connexion : retient le lien d'ouverture de l'app et ceux reçus ensuite. */
export function watchInvites(): () => void {
  void Linking.getInitialURL().then(rememberInvite);
  const subscription = Linking.addEventListener("url", ({ url }) => rememberInvite(url));
  return () => subscription.remove();
}
