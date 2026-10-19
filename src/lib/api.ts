import { fetch as expoFetch } from "expo/fetch";
import { Platform } from "react-native";
import { useAuth } from "./auth-store";
import type { Tokens } from "./types";

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/+$/, "");

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: { path: string; message: string }[],
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  auth?: boolean;
  /** Corps binaire (enregistrement audio) envoyé tel quel, à la place d'un corps JSON. */
  raw?: { data: ArrayBuffer | Blob; contentType: string };
};

function timeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

async function send(path: string, options: RequestOptions, accessToken?: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (options.raw) headers["Content-Type"] = options.raw.contentType;
  else if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const tz = timeZone();
  if (tz) headers["X-Timezone"] = tz;
  try {
    if (options.raw && Platform.OS !== "web") {
      // Le fetch de React Native n'envoie pas de corps binaire : celui d'Expo le fait.
      const response = await expoFetch(`${API_URL}/api/v1${path}`, { method: options.method ?? "POST", headers, body: options.raw.data });
      return response as unknown as Response;
    }
    return await fetch(`${API_URL}/api/v1${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.raw ? options.raw.data : options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch (error) {
    // En développement : adresse appelée et erreur d'origine, pour diagnostiquer.
    const where = __DEV__ ? ` (${API_URL} : ${error instanceof Error ? error.message : String(error)})` : "";
    throw new ApiError(0, "NETWORK_ERROR", `Impossible de joindre le serveur${where}. Vérifiez votre connexion.`);
  }
}

async function parse<T>(response: Response): Promise<T> {
  if (response.status === 204) return undefined as T;
  const data = (await response.json().catch(() => null)) as
    | (T & { error?: { code: string; message: string; details?: { path: string; message: string }[] } })
    | null;
  if (!response.ok) {
    const error = data?.error;
    throw new ApiError(response.status, error?.code ?? "HTTP_ERROR", error?.message ?? `Erreur ${response.status}`, error?.details);
  }
  return data as T;
}

/**
 * Résultat d'un rafraîchissement : nouveaux jetons, session refusée par le serveur (jeton révoqué ou
 * expiré : il faut se reconnecter), ou serveur injoignable (réseau, 5xx, 429 : la session est gardée).
 */
type RefreshResult = { tokens: Tokens } | "rejected" | "unavailable";

// Un seul rafraîchissement à la fois, partagé par toutes les requêtes en échec.
let refreshing: Promise<RefreshResult> | null = null;

async function refreshTokens(refreshToken: string): Promise<RefreshResult> {
  refreshing ??= (async (): Promise<RefreshResult> => {
    try {
      const response = await send("/auth/refresh", { method: "POST", body: { refreshToken } });
      if (!response.ok) return response.status >= 400 && response.status < 500 && response.status !== 429 ? "rejected" : "unavailable";
      const tokens = (await response.json()) as Tokens;
      await useAuth.getState().setTokens({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
      return { tokens };
    } catch {
      return "unavailable";
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const useToken = options.auth ?? true;
  const tokens = useToken ? useAuth.getState().tokens : null;
  let response = await send(path, options, tokens?.accessToken);

  if (response.status === 401 && useToken && tokens) {
    // Jetons renouvelés entre-temps par une autre requête : on rejoue avec les nouveaux, sans
    // présenter l'ancien refresh token (le serveur y verrait une réutilisation et fermerait la session).
    const current = useAuth.getState().tokens;
    if (current && current.accessToken !== tokens.accessToken) {
      response = await send(path, options, current.accessToken);
    } else {
      const renewed = await refreshTokens(tokens.refreshToken);
      if (renewed === "rejected") {
        await useAuth.getState().signOut();
        throw new ApiError(401, "SESSION_EXPIRED", "Votre session a expiré, reconnectez-vous.");
      }
      if (renewed === "unavailable") {
        throw new ApiError(0, "NETWORK_ERROR", "Impossible de joindre le serveur. Vérifiez votre connexion.");
      }
      response = await send(path, options, renewed.tokens.accessToken);
    }
  }
  return parse<T>(response);
}

export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.details?.[0]?.message ?? error.message;
  return "Une erreur inattendue est survenue.";
}
