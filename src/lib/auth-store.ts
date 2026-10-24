import { create } from "zustand";
import { loadTokens, loadUser, saveTokens, saveUser } from "./session-storage";
import type { AuthResponse, Tokens, User } from "./types";
import { forgetProfile } from "./profile-memory";

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
    // L'utilisateur de la dernière session est relu avec les jetons : thème enfant, traduction et
    // prénom sont justes dès le premier rendu, réseau ou pas ; `/me` le rafraîchit ensuite.
    const [tokens, user] = await Promise.all([loadTokens(), loadUser()]);
    set({ tokens, user: tokens ? user : null, status: tokens ? "signedIn" : "signedOut" });
  },
  async signIn({ user, accessToken, refreshToken }) {
    const tokens = { accessToken, refreshToken };
    await saveTokens(tokens);
    await saveUser(user);
    set({ tokens, user, status: "signedIn" });
  },
  async setTokens(tokens) {
    await saveTokens(tokens);
    set({ tokens });
  },
  setUser(user) {
    set({ user });
    void saveUser(user);
  },
  async signOut() {
    await saveTokens(null);
    await forgetProfile();
    set({ tokens: null, user: null, status: "signedOut" });
  },
}));
