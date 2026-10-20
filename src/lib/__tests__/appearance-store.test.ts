/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => undefined) }));

import { Appearance } from "react-native";
import { sanitizeAppearanceMode, useAppearance } from "../appearance-store";

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
