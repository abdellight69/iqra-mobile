import { API_URL } from "./api";

/** Pages légales du site (même hôte que l'API, sauf EXPO_PUBLIC_SITE_URL). */
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? API_URL).replace(/\/+$/, "");
export const TERMS_URL = `${SITE_URL}/conditions/`;
export const PRIVACY_URL = `${SITE_URL}/confidentialite/`;
