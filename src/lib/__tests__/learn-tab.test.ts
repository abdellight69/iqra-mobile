/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => undefined) }));

import { defaultLearnTab, sanitizeLearnTab } from "../learn-tab";

describe("onglet Vocabulaire retenu", () => {
  it("ne relit que les trois onglets connus", () => {
    expect(sanitizeLearnTab("themes")).toBe("themes");
    expect(sanitizeLearnTab("fiches")).toBe("fiches");
    expect(sanitizeLearnTab("lecons")).toBeNull();
    expect(sanitizeLearnTab(null)).toBeNull();
  });

  it("ouvre sur les thèmes pour un enfant, sur le parcours sinon", () => {
    expect(defaultLearnTab(true)).toBe("themes");
    expect(defaultLearnTab(false)).toBe("sourates");
  });
});
