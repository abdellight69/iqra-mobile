import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Tokens, User } from "./types";

const KEY = "iqra.session";
const USER_KEY = "iqra.session.user";

async function read(key: string): Promise<string | null> {
  try {
    return (Platform.OS === "web" ? globalThis.localStorage?.getItem(key) : await SecureStore.getItemAsync(key)) ?? null;
  } catch {
    return null;
  }
}

async function write(key: string, value: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (value) globalThis.localStorage?.setItem(key, value);
    else globalThis.localStorage?.removeItem(key);
    return;
  }
  if (value) await SecureStore.setItemAsync(key, value);
  else await SecureStore.deleteItemAsync(key);
}

// Le refresh token est conservé dans le trousseau (iOS) / Keystore (Android).
// Sur le web (développement uniquement), on se replie sur localStorage.
export async function loadTokens(): Promise<Tokens | null> {
  const raw = await read(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Tokens>;
    return parsed.accessToken && parsed.refreshToken ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken } : null;
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: Tokens | null): Promise<void> {
  await write(KEY, tokens ? JSON.stringify(tokens) : null);
  if (!tokens) await write(USER_KEY, null);
}

/**
 * Dernier utilisateur connu du profil de la session (prénom, réglages, `isChild`…), pour que l'app
 * démarre avec le bon thème (enfant ou adulte) et la bonne traduction même sans réseau.
 */
export async function loadUser(): Promise<User | null> {
  const raw = await read(USER_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<User>;
    return parsed && typeof parsed.id === "string" && typeof parsed.displayName === "string" ? (parsed as User) : null;
  } catch {
    return null;
  }
}

export async function saveUser(user: User | null): Promise<void> {
  await write(USER_KEY, user ? JSON.stringify(user) : null);
}
