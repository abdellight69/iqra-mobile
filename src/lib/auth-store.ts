import { create } from "zustand";
import { loadTokens, saveTokens } from "./session-storage";
import type { AuthResponse, Tokens, User } from "./types";

type AuthState = {
  status: "loading" | "signedIn" | "signedOut";
  tokens: Tokens | null;
  user: User | null;
  bootstrap: () => Promise<void>;
  signIn: (response: AuthResponse) => Promise<void>;
  setTokens: (tokens: Tokens) => Promise<void>;
  setUser: (user: User) => void;
  signOut: () => Promise<void>;
};

export const useAuth = create<AuthState>((set) => ({
  status: "loading",
  tokens: null,
  user: null,
  async bootstrap() {
    const tokens = await loadTokens();
    set({ tokens, status: tokens ? "signedIn" : "signedOut" });
  },
  async signIn({ user, accessToken, refreshToken }) {
    const tokens = { accessToken, refreshToken };
    await saveTokens(tokens);
    set({ tokens, user, status: "signedIn" });
  },
  async setTokens(tokens) {
    await saveTokens(tokens);
    set({ tokens });
  },
  setUser(user) {
    set({ user });
  },
  async signOut() {
    await saveTokens(null);
    set({ tokens: null, user: null, status: "signedOut" });
  },
}));
