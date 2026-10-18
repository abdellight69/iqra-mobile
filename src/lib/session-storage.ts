import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import type { Tokens } from "./types";

const KEY = "iqra.session";

// Le refresh token est conservé dans le trousseau (iOS) / Keystore (Android).
// Sur le web (développement uniquement), on se replie sur localStorage.
export async function loadTokens(): Promise<Tokens | null> {
  const raw = Platform.OS === "web" ? globalThis.localStorage?.getItem(KEY) : await SecureStore.getItemAsync(KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Tokens>;
    return parsed.accessToken && parsed.refreshToken ? { accessToken: parsed.accessToken, refreshToken: parsed.refreshToken } : null;
  } catch {
    return null;
  }
}

export async function saveTokens(tokens: Tokens | null): Promise<void> {
  if (Platform.OS === "web") {
    if (tokens) globalThis.localStorage?.setItem(KEY, JSON.stringify(tokens));
    else globalThis.localStorage?.removeItem(KEY);
    return;
  }
  if (tokens) await SecureStore.setItemAsync(KEY, JSON.stringify(tokens));
  else await SecureStore.deleteItemAsync(KEY);
}
