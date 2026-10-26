import { parseJoinInput } from "./families-format";

/**
 * Liens universels : un lien https://eqra.fr/… ouvert par le système (Universal Links iOS,
 * App Links Android) est traduit en route de l'app. Logique pure, sans module natif, appelée
 * par `src/app/+native-intent.ts` et testée dans `__tests__/native-intent.test.ts`.
 *
 *   /rejoindre/?t=<jeton> | ?c=<code>  → /famille/rejoindre?t=… | ?c=…   (paramètres lus par famille/rejoindre.tsx)
 *   /verifier/?token=<jeton>           → /verify-email?token=…
 *   /reinitialiser/?token=<jeton>      → /reset-password?token=…
 *   /s/<sourate>[/<verset>]            → /surah/<id>[?verse=<n>]          (paramètre lu par surah/[id].tsx)
 *   autre page du site                 → / (accueil)
 */

/** Hôtes du site dont les liens ouvrent l'app (`associatedDomains` et `intentFilters` d'app.json). */
export const SITE_HOSTS = ["eqra.fr", "www.eqra.fr"];

/** Jeton opaque (vérification, réinitialisation) : URL-safe, comme ceux du serveur. */
const TOKEN = /^[A-Za-z0-9_-]{16,200}$/;
const CHAPTERS = 114;
/** Al-Baqara, la plus longue sourate. */
const MAX_VERSES = 286;

export type ParsedUrl = { scheme: string; host: string; path: string; query: Record<string, string> };

/**
 * Découpe une URL absolue sans `URL`/`URLSearchParams` (incomplets sur React Native) ;
 * null si la chaîne n'est pas une URL absolue.
 */
export function parseUrl(url: string): ParsedUrl | null {
  const match = /^([a-z][a-z0-9+.-]*):\/\/([^/?#]*)([^?#]*)(?:\?([^#]*))?(?:#.*)?$/i.exec(url.trim());
  if (!match) return null;
  const [, scheme, host, path, query] = match;
  return { scheme: scheme!.toLowerCase(), host: host!.toLowerCase(), path: path || "/", query: parseQuery(query ?? "") };
}

/** `a=1&b=2` → `{ a: "1", b: "2" }` ; la première valeur d'une clé répétée est gardée. */
export function parseQuery(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const i = pair.indexOf("=");
    const key = decode(i === -1 ? pair : pair.slice(0, i));
    if (key && !(key in out)) out[key] = decode(i === -1 ? "" : pair.slice(i + 1));
  }
  return out;
}

function decode(part: string): string {
  try {
    return decodeURIComponent(part.replace(/\+/g, " "));
  } catch {
    return part;
  }
}

function tokenQuery(query: Record<string, string>): string {
  const token = query.token ?? "";
  return TOKEN.test(token) ? `?token=${encodeURIComponent(token)}` : "";
}

function integer(part: string | undefined, max: number): number | null {
  if (!part || !/^\d{1,3}$/.test(part)) return null;
  const n = Number(part);
  return n >= 1 && n <= max ? n : null;
}

/** Vrai pour un lien du site (https://eqra.fr/…), faux pour le schéma `eqra://` ou un autre hôte. */
export function isSiteLink(url: string): boolean {
  const parsed = parseUrl(url);
  return !!parsed && (parsed.scheme === "https" || parsed.scheme === "http") && SITE_HOSTS.includes(parsed.host);
}

/**
 * Route interne correspondant à un lien du site ; null si le lien n'est pas un lien du site
 * (schéma `eqra://`, autre hôte, chaîne quelconque) : l'appelant le laisse alors tel quel.
 */
export function routeFromUniversalLink(url: string): string | null {
  const parsed = parseUrl(url);
  if (!parsed || !isSiteLink(url)) return null;
  const segments = parsed.path.split("/").filter(Boolean).map(decode);
  switch (segments[0]) {
    case "rejoindre": {
      const credential = parseJoinInput(url);
      if (!credential) return "/famille/rejoindre";
      return "token" in credential ? `/famille/rejoindre?t=${encodeURIComponent(credential.token)}` : `/famille/rejoindre?c=${credential.code}`;
    }
    case "verifier":
      return `/verify-email${tokenQuery(parsed.query)}`;
    case "reinitialiser":
      return `/reset-password${tokenQuery(parsed.query)}`;
    case "s": {
      const chapter = integer(segments[1], CHAPTERS);
      if (!chapter) return "/quran";
      const verse = integer(segments[2], MAX_VERSES);
      return verse ? `/surah/${chapter}?verse=${verse}` : `/surah/${chapter}`;
    }
    default:
      return "/";
  }
}

/**
 * Ce que `redirectSystemPath` renvoie : la route traduite pour un lien du site, sinon le chemin
 * d'origine (un `null` ferait ignorer le lien par expo-router).
 */
export function redirectSystemPathTo(path: string): string {
  try {
    return routeFromUniversalLink(path) ?? path;
  } catch {
    return "/";
  }
}
