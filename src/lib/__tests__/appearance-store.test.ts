/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => null),
  setItemAsync: jest.fn(async () => undefined),
  deleteItemAsync: jest.fn(async () => undefined),
}));

import { Appearance } from "react-native";
import { sanitizeAppearanceMode, useAppearance } from "../appearance-store";
import { useAuth } from "../auth-store";
import { availableTheme, isDarkPalette, palette, sanitizeThemeId, THEMES } from "../palettes";
import type { User } from "../types";

describe("apparence : thème clair, sombre ou celui du téléphone", () => {
  it("ne relit que les trois choix connus", () => {
    expect(sanitizeAppearanceMode("dark")).toBe("dark");
    expect(sanitizeAppearanceMode("light")).toBe("light");
    expect(sanitizeAppearanceMode("system")).toBe("system");
    expect(sanitizeAppearanceMode("auto")).toBeNull();
    expect(sanitizeAppearanceMode(null)).toBeNull();
  });

  it("force le thème de toute l'app, et le rend au téléphone avec « Comme le téléphone »", () => {
    const spy = jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => undefined);
    useAppearance.getState().setMode("light");
    expect(spy).toHaveBeenLastCalledWith("light");
    expect(useAppearance.getState().mode).toBe("light");
    useAppearance.getState().setMode("system");
    expect(spy).toHaveBeenLastCalledWith("unspecified");
    spy.mockRestore();
  });
});

describe("apparence : thèmes de couleurs et abonnement Soutien", () => {
  const user = (supporter?: boolean): User => ({
    id: "u1",
    email: "a@example.com",
    displayName: "Amina",
    translationId: null,
    recitationId: null,
    dailyGoalXp: 30,
    createdAt: "2026-10-20T00:00:00Z",
    ...(supporter === undefined ? {} : { supporter }),
  });

  it("ne relit que les thèmes connus", () => {
    expect(sanitizeThemeId("nuit")).toBe("nuit");
    expect(sanitizeThemeId("violet")).toBeNull();
    expect(sanitizeThemeId(3)).toBeNull();
  });

  it("un thème Soutien ne s'applique qu'aux abonnés ; le thème par défaut reste pour tous", () => {
    expect(availableTheme("nuit", true)).toBe("nuit");
    expect(availableTheme("nuit", false)).toBe("eqra");
    expect(availableTheme("eqra", false)).toBe("eqra");
    expect(THEMES.filter((t) => !t.supporter).map((t) => t.id)).toEqual(["eqra"]);
  });

  it("chaque thème a sa palette claire et sombre, reconnue comme telle", () => {
    for (const theme of THEMES) {
      expect(palette(theme.id, false)).toBe(theme.light);
      expect(palette(theme.id, true)).toBe(theme.dark);
      expect(isDarkPalette(theme.dark)).toBe(true);
      expect(isDarkPalette(theme.light)).toBe(false);
    }
  });

  it("l'abonnement suit l'utilisateur connecté et s'oublie à la déconnexion", async () => {
    useAppearance.getState().setTheme("sable");
    expect(useAppearance.getState().theme).toBe("sable");

    useAuth.getState().setUser(user(true));
    expect(useAppearance.getState().supporter).toBe(true);
    useAuth.getState().setUser(user(false));
    expect(useAppearance.getState().supporter).toBe(false);
    // Serveur plus ancien, sans le champ : pas d'abonnement.
    useAuth.getState().setUser(user(true));
    useAuth.getState().setUser(user());
    expect(useAppearance.getState().supporter).toBe(false);

    useAuth.getState().setUser(user(true));
    await useAuth.getState().signOut();
    expect(useAppearance.getState().supporter).toBe(false);
    // Le choix est gardé : il revient avec un nouvel abonnement.
    expect(useAppearance.getState().theme).toBe("sable");
  });
});
