import { api, ApiError, errorMessage } from "./api";
import type { User } from "./types";

/**
 * Bandeau « Confirmez votre adresse e-mail » : seulement pour le titulaire du compte dont
 * l'adresse n'est pas confirmée. Un serveur plus ancien n'envoie pas `emailVerified` : rien à
 * demander. Un profil de la famille n'a pas d'adresse à confirmer.
 */
export function needsEmailVerification(user: User | null | undefined): boolean {
  return user?.emailVerified === false && user.isOwner !== false;
}

// Fermé pour la session : le bandeau réapparaît au prochain lancement de l'app.
let dismissed = false;

export function isVerifyBannerDismissed(): boolean {
  return dismissed;
}

export function dismissVerifyBanner() {
  dismissed = true;
}

/** Tests : revient à l'état initial. */
export function resetVerifyBanner() {
  dismissed = false;
}

export type ResendResult = {
  ok: boolean;
  /** 409 : le serveur dit que l'adresse est déjà confirmée (le profil est à rafraîchir). */
  alreadyVerified?: boolean;
  message: string;
};

/** Renvoie l'e-mail de confirmation (`POST /me/verify-email/resend`) : 202 envoyé, 409 déjà confirmée. */
export async function resendVerificationEmail(): Promise<ResendResult> {
  try {
    await api("/me/verify-email/resend", { method: "POST" });
    return { ok: true, message: "E-mail envoyé. Pensez à regarder le dossier des indésirables." };
  } catch (error) {
    if (error instanceof ApiError && error.status === 409) return { ok: true, alreadyVerified: true, message: "Adresse déjà confirmée." };
    return { ok: false, message: errorMessage(error) };
  }
}
