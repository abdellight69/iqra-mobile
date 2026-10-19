/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
/**
 * Rafraîchissement de session : un seul rafraîchissement partagé, pas de déconnexion sur une
 * panne, réutilisation des jetons renouvelés entre-temps.
 */
jest.mock("expo/fetch", () => ({ fetch: jest.fn() }));
jest.mock("../session-storage", () => ({ loadTokens: jest.fn(async () => null), saveTokens: jest.fn(async () => undefined) }));

import { api, ApiError } from "../api";
import { useAuth } from "../auth-store";

type Call = { url: string; init: RequestInit };
const calls: Call[] = [];
const json = (status: number, body: unknown) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

function respondWith(handler: (call: Call, index: number) => Promise<unknown> | unknown) {
  globalThis.fetch = jest.fn(async (url: string, init: RequestInit) => {
    const call = { url: String(url), init };
    calls.push(call);
    return handler(call, calls.length - 1);
  }) as unknown as typeof fetch;
}

const auth = (call: Call) => (call.init.headers as Record<string, string>).Authorization;

beforeEach(async () => {
  calls.length = 0;
  await useAuth.getState().signIn({ user: { id: "u" } as never, accessToken: "old", refreshToken: "r1", expiresIn: 900 });
});

describe("session", () => {
  it("rafraîchit une fois sur 401 et rejoue la requête avec le nouveau jeton", async () => {
    respondWith((call) => {
      if (call.url.endsWith("/auth/refresh")) return json(200, { accessToken: "new", refreshToken: "r2" });
      return auth(call) === "Bearer new" ? json(200, { ok: true }) : json(401, { error: { code: "UNAUTHORIZED", message: "expiré" } });
    });
    await expect(api("/me")).resolves.toEqual({ ok: true });
    expect(calls.filter((c) => c.url.endsWith("/auth/refresh"))).toHaveLength(1);
    expect(useAuth.getState().tokens).toEqual({ accessToken: "new", refreshToken: "r2" });
  });

  it("déconnecte seulement si le serveur refuse le refresh token", async () => {
    respondWith((call) => (call.url.endsWith("/auth/refresh") ? json(401, {}) : json(401, {})));
    await expect(api("/me")).rejects.toMatchObject({ code: "SESSION_EXPIRED" });
    expect(useAuth.getState().status).toBe("signedOut");
  });

  it("garde la session si le rafraîchissement échoue pour cause de réseau ou de serveur", async () => {
    respondWith((call) => (call.url.endsWith("/auth/refresh") ? json(502, {}) : json(401, {})));
    await expect(api("/me")).rejects.toMatchObject({ code: "NETWORK_ERROR" });
    expect(useAuth.getState().status).toBe("signedIn");
    expect(useAuth.getState().tokens?.refreshToken).toBe("r1");
  });

  it("réutilise des jetons renouvelés entre-temps au lieu de présenter l'ancien refresh token", async () => {
    respondWith((call) => {
      if (call.url.endsWith("/auth/refresh")) throw new Error("ne doit pas être appelé");
      if (auth(call) === "Bearer old") {
        // Une autre requête a renouvelé la session pendant que celle-ci était en vol.
        void useAuth.getState().setTokens({ accessToken: "new", refreshToken: "r2" });
        return json(401, {});
      }
      return json(200, { ok: true });
    });
    await expect(api("/me")).resolves.toEqual({ ok: true });
    expect(calls.map(auth)).toEqual(["Bearer old", "Bearer new"]);
  });

  it("les erreurs du serveur deviennent des ApiError typées", async () => {
    respondWith(() => json(400, { error: { code: "VALIDATION", message: "Champ manquant", details: [{ path: "x", message: "requis" }] } }));
    const error = await api("/me").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 400, code: "VALIDATION" });
  });
});
