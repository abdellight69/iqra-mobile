import { API_URL } from "./api";

/**
 * Site public : `EXPO_PUBLIC_SITE_URL`, sinon l'hôte de l'API (sans son port), toujours en https
 * (le site n'est servi qu'en HTTPS ; une API de développement en http n'y change rien).
 */
export const SITE_URL = siteUrl(process.env.EXPO_PUBLIC_SITE_URL, API_URL);

export function siteUrl(configured: string | undefined, apiUrl: string): string {
  if (configured) return configured.replace(/\/+$/, "");
  try {
    return `https://${new URL(apiUrl).hostname}`;
  } catch {
    return apiUrl.replace(/\/+$/, "");
  }
}

export const TERMS_URL = `${SITE_URL}/conditions/`;
export const PRIVACY_URL = `${SITE_URL}/confidentialite/`;
/** Page « rejoindre » du site, avec le code d'invitation d'une famille. */
export const joinPageUrl = (code: string) => `${SITE_URL}/rejoindre/?c=${encodeURIComponent(code)}`;
