/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
/**
 * Démarrage de l'app : l'utilisateur de la dernière session est relu avec les jetons, pour que le
 * thème enfant et la traduction soient justes dès le premier rendu, même sans réseau.
 */
const mockStorage = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => void mockStorage.set(key, value)),
  deleteItemAsync: jest.fn(async (key: string) => void mockStorage.delete(key)),
}));

import { useAppearance } from "../appearance-store";
import { useAuth } from "../auth-store";
import type { User } from "../types";

const child: User = { id: "c1", email: null, displayName: "Nour", isChild: true, translationId: 31, recitationId: 7, dailyGoalXp: 30, createdAt: "2026-10-01T00:00:00Z" };

beforeEach(() => {
  mockStorage.clear();
  useAuth.setState({ status: "loading", tokens: null, user: null });
});

describe("session persistée", () => {
  it("restaure les jetons et l'utilisateur au démarrage, et applique le thème enfant", async () => {
    await useAuth.getState().signIn({ user: child, accessToken: "a", refreshToken: "r", expiresIn: 900 });
    useAuth.setState({ status: "loading", tokens: null, user: null });
    await useAuth.getState().bootstrap();
    const state = useAuth.getState();
    expect(state.status).toBe("signedIn");
    expect(state.tokens).toEqual({ accessToken: "a", refreshToken: "r" });
    expect(state.user?.displayName).toBe("Nour");
    expect(state.user?.translationId).toBe(31);
    expect(useAppearance.getState().kids).toBe(true);
  });

  it("démarre déconnecté sans jeton, même si un utilisateur traîne", async () => {
    mockStorage.set("iqra.session.user", JSON.stringify(child));
    await useAuth.getState().bootstrap();
    expect(useAuth.getState().status).toBe("signedOut");
    expect(useAuth.getState().user).toBeNull();
  });

  it("oublie l'utilisateur à la déconnexion", async () => {
    await useAuth.getState().signIn({ user: child, accessToken: "a", refreshToken: "r", expiresIn: 900 });
    await useAuth.getState().signOut();
    expect(mockStorage.has("iqra.session.user")).toBe(false);
    expect(useAppearance.getState().kids).toBe(false);
  });

  it("met à jour l'utilisateur persisté quand /me le rafraîchit", async () => {
    await useAuth.getState().signIn({ user: child, accessToken: "a", refreshToken: "r", expiresIn: 900 });
    useAuth.getState().setUser({ ...child, displayName: "Nour B." });
    await new Promise((r) => setTimeout(r, 0));
    expect(JSON.parse(mockStorage.get("iqra.session.user")!).displayName).toBe("Nour B.");
  });
});
