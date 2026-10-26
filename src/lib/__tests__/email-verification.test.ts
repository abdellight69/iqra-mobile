/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
/**
 * Bandeau « Confirmez votre adresse » : à qui il s'adresse, fermeture pour la session, et le
 * renvoi de l'e-mail selon la réponse du serveur (202, 409, erreur).
 */
jest.mock("../api", () => {
  const actual = jest.requireActual<typeof import("../api")>("../api");
  return { ...actual, api: jest.fn() };
});

import { api, ApiError } from "../api";
import { dismissVerifyBanner, isVerifyBannerDismissed, needsEmailVerification, resendVerificationEmail, resetVerifyBanner } from "../email-verification";
import type { User } from "../types";

const owner: User = { id: "u", email: "a@b.fr", displayName: "A", translationId: null, recitationId: null, dailyGoalXp: 30, createdAt: "2026-01-01" };
const mockedApi = api as jest.MockedFunction<typeof api>;

beforeEach(() => {
  resetVerifyBanner();
  mockedApi.mockReset();
});

describe("à qui s'adresse le bandeau", () => {
  it("au titulaire dont l'adresse n'est pas confirmée", () => {
    expect(needsEmailVerification({ ...owner, emailVerified: false })).toBe(true);
    expect(needsEmailVerification({ ...owner, emailVerified: false, isOwner: true })).toBe(true);
  });

  it("pas à un profil de la famille, ni à une adresse confirmée, ni à un serveur qui ne le dit pas", () => {
    expect(needsEmailVerification({ ...owner, emailVerified: false, isOwner: false })).toBe(false);
    expect(needsEmailVerification({ ...owner, emailVerified: true })).toBe(false);
    expect(needsEmailVerification(owner)).toBe(false);
    expect(needsEmailVerification(undefined)).toBe(false);
    expect(needsEmailVerification(null)).toBe(false);
  });
});

describe("fermeture pour la session", () => {
  it("reste fermé une fois fermé", () => {
    expect(isVerifyBannerDismissed()).toBe(false);
    dismissVerifyBanner();
    expect(isVerifyBannerDismissed()).toBe(true);
  });
});

describe("renvoi de l'e-mail", () => {
  it("202 : e-mail envoyé", async () => {
    mockedApi.mockResolvedValueOnce(null);
    const result = await resendVerificationEmail();
    expect(mockedApi).toHaveBeenCalledWith("/me/verify-email/resend", { method: "POST" });
    expect(result.ok).toBe(true);
    expect(result.alreadyVerified).toBeUndefined();
    expect(result.message).toMatch(/^E-mail envoyé/);
  });

  it("409 : adresse déjà confirmée", async () => {
    mockedApi.mockRejectedValueOnce(new ApiError(409, "ALREADY_VERIFIED", "Déjà confirmée"));
    const result = await resendVerificationEmail();
    expect(result).toEqual({ ok: true, alreadyVerified: true, message: "Adresse déjà confirmée." });
  });

  it("autre erreur : le message du serveur, sans lever", async () => {
    mockedApi.mockRejectedValueOnce(new ApiError(429, "RATE_LIMITED", "Trop de demandes, réessayez dans une minute."));
    expect(await resendVerificationEmail()).toEqual({ ok: false, message: "Trop de demandes, réessayez dans une minute." });
    mockedApi.mockRejectedValueOnce(new Error("boom"));
    expect((await resendVerificationEmail()).ok).toBe(false);
  });
});
