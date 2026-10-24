/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
/**
 * Mesure d'usage : file sur l'appareil, envoi par lots, abandon des lots refusés, conservation
 * sur panne réseau, rien sans session.
 */
const mockFiles = new Map<string, string>();
jest.mock("expo-file-system", () => ({
  Paths: { document: "doc" },
  File: class {
    mockKey: string;
    constructor(mockDir: string, mockName: string) {
      this.mockKey = `${mockDir}/${mockName}`;
    }
    get exists() {
      return mockFiles.has(this.mockKey);
    }
    textSync() {
      return mockFiles.get(this.mockKey) ?? "";
    }
    write(text: string) {
      mockFiles.set(this.mockKey, text);
    }
    delete() {
      mockFiles.delete(this.mockKey);
    }
  },
}));
jest.mock("../session-storage", () => ({
  loadTokens: jest.fn(async () => null),
  saveTokens: jest.fn(async () => undefined),
  loadUser: jest.fn(async () => null),
  saveUser: jest.fn(async () => undefined),
}));
const mockApi = jest.fn();
// Le vrai `ApiError` est conservé ; seul `api()` est remplacé.
jest.mock("../api", () => ({ ...jest.requireActual("../api"), api: (...args: unknown[]) => mockApi(...args) }));

import { ApiError } from "../api";
import { useAuth } from "../auth-store";
import { _internal, clearEvents, flushEvents, track, trackAppOpen } from "../events";

beforeEach(() => {
  jest.useFakeTimers();
  mockFiles.clear();
  mockApi.mockReset();
  clearEvents();
  useAuth.setState({ status: "signedIn", tokens: { accessToken: "a", refreshToken: "r" }, user: null });
});

afterEach(() => {
  jest.useRealTimers();
});

describe("mesure d'usage", () => {
  it("n'enregistre rien sans session", () => {
    useAuth.setState({ status: "signedOut", tokens: null, user: null });
    track("plan_viewed");
    expect(_internal.read()).toEqual([]);
  });

  it("garde l'événement sur l'appareil puis l'envoie en un lot", async () => {
    mockApi.mockResolvedValue(undefined);
    track("onboarding_done");
    track("session_done", { kind: "words" });
    expect(_internal.read()).toHaveLength(2);
    await flushEvents();
    expect(mockApi).toHaveBeenCalledTimes(1);
    const [path, options] = mockApi.mock.calls[0] as [string, { body: { events: { name: string }[] } }];
    expect(path).toBe("/events");
    expect(options.body.events.map((e) => e.name)).toEqual(["onboarding_done", "session_done"]);
    expect(_internal.read()).toEqual([]);
  });

  it("garde la file quand le réseau manque, la vide quand le serveur refuse le lot", async () => {
    track("daily_done");
    mockApi.mockRejectedValueOnce(new ApiError(0, "NETWORK_ERROR", "réseau"));
    await flushEvents();
    expect(_internal.read()).toHaveLength(1);
    mockApi.mockRejectedValueOnce(new ApiError(404, "NOT_FOUND", "serveur ancien"));
    await flushEvents();
    expect(_internal.read()).toEqual([]);
  });

  it("n'ouvre l'app qu'une fois par demi-heure", () => {
    trackAppOpen();
    trackAppOpen();
    expect(_internal.read()).toHaveLength(1);
  });

  it("oublie tout à la déconnexion", () => {
    track("mission_done");
    clearEvents();
    expect(_internal.read()).toEqual([]);
  });
});
