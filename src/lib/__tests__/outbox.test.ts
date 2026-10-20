/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
/**
 * File d'attente des évaluations hors ligne : fichier simulé en mémoire, API simulée.
 */
const mockFiles = new Map<string, string>();
jest.mock("expo-file-system", () => ({
  Paths: { document: "doc" },
  File: class {
    private readonly key: string;
    constructor(...parts: string[]) {
      this.key = parts.join("/");
    }
    get exists() {
      return mockFiles.has(this.key);
    }
    textSync() {
      return mockFiles.get(this.key) ?? "";
    }
    write(text: string) {
      mockFiles.set(this.key, text);
    }
    delete() {
      mockFiles.delete(this.key);
    }
  },
}));

const mockApi = jest.fn();
jest.mock("../api", () => {
  class ApiError extends Error {
    status: number;
    code: string;
    constructor(status: number, code: string, message: string) {
      super(message);
      this.status = status;
      this.code = code;
    }
  }
  return { api: (...args: unknown[]) => mockApi(...args), ApiError };
});

import { ApiError } from "../api";
import { clearOutbox, flushReviews, pendingReviewCount, pendingSessionCount, queueReview, queueSession } from "../outbox";

const review = (verseNumber: number) => ({ chapterId: 1, verseNumber, quality: 4 });

beforeEach(() => {
  mockFiles.clear();
  mockApi.mockReset();
});

describe("évaluations hors ligne", () => {
  it("envoie les évaluations dans l'ordre et vide la file", async () => {
    queueReview(review(1));
    queueReview(review(2));
    mockApi.mockResolvedValue({});
    await expect(flushReviews()).resolves.toBe(2);
    expect(mockApi.mock.calls.map((c: unknown[]) => (c[1] as { body: { verseNumber: number } }).body.verseNumber)).toEqual([1, 2]);
    expect(pendingReviewCount()).toBe(0);
  });

  it("s'arrête à la première panne réseau sans rien perdre", async () => {
    queueReview(review(1));
    queueReview(review(2));
    mockApi.mockRejectedValue(new ApiError(0, "NETWORK_ERROR", "hors ligne"));
    await expect(flushReviews()).resolves.toBe(0);
    expect(pendingReviewCount()).toBe(2);
  });

  it("abandonne une évaluation refusée par le serveur (4xx) et continue", async () => {
    queueReview(review(1));
    queueReview(review(2));
    mockApi.mockRejectedValueOnce(new ApiError(404, "NOT_FOUND", "verset retiré")).mockResolvedValue({});
    await expect(flushReviews()).resolves.toBe(2);
    expect(pendingReviewCount()).toBe(0);
  });

  it("n'écrase pas une évaluation ajoutée pendant un envoi", async () => {
    queueReview(review(1));
    let release: () => void = () => undefined;
    mockApi.mockImplementationOnce(() => new Promise<void>((resolve) => (release = resolve)));
    const flushing = flushReviews();
    await Promise.resolve();
    queueReview(review(2)); // ajoutée pendant que la première est en vol
    mockApi.mockResolvedValue({});
    release();
    await expect(flushing).resolves.toBe(2);
    expect(pendingReviewCount()).toBe(0);
    expect(mockApi).toHaveBeenCalledTimes(2);
  });

  it("clearOutbox supprime tout", () => {
    queueReview(review(1));
    clearOutbox();
    expect(pendingReviewCount()).toBe(0);
  });
});

describe("séances de vocabulaire hors ligne", () => {
  const session = (wordId: string) => ({ answers: [{ wordId, correct: true }] });

  it("garde la date de la séance et l'envoie après les évaluations", async () => {
    queueReview(review(1));
    queueSession({ ...session("p23-01"), playedAt: "2026-10-19T20:00:00.000Z" });
    expect(pendingReviewCount()).toBe(2);
    expect(pendingSessionCount()).toBe(1);
    mockApi.mockResolvedValue({});
    await expect(flushReviews()).resolves.toBe(2);
    expect(mockApi.mock.calls.map((c: unknown[]) => c[0])).toEqual(["/memorization/reviews", "/vocabulary/sessions"]);
    expect((mockApi.mock.calls[1]![1] as { body: { playedAt: string } }).body.playedAt).toBe("2026-10-19T20:00:00.000Z");
    expect(pendingReviewCount()).toBe(0);
  });

  it("date une séance mise en file sans date", () => {
    queueSession(session("p23-02"));
    expect(pendingSessionCount()).toBe(1);
  });

  it("n'essaie pas les séances quand le serveur est injoignable", async () => {
    queueReview(review(1));
    queueSession(session("p23-01"));
    mockApi.mockRejectedValue(new ApiError(0, "NETWORK_ERROR", "hors ligne"));
    await expect(flushReviews()).resolves.toBe(0);
    expect(mockApi).toHaveBeenCalledTimes(1);
    expect(pendingReviewCount()).toBe(2);
  });

  it("clearOutbox vide aussi les séances", () => {
    queueSession(session("p23-01"));
    clearOutbox();
    expect(pendingSessionCount()).toBe(0);
  });
});
