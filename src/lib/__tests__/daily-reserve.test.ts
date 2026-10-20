/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
/** Réserve hors ligne de la séance du jour : fichier simulé en mémoire. */
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

import {
  consumeDailyReserve,
  loadDailyReserve,
  RESERVE_MAX_AGE_MS,
  RESERVE_REFRESH_MS,
  reserveNeedsRefresh,
  reserveVerseKeys,
  saveDailyReserve,
  type DailyReserve,
} from "../daily-reserve";
import type { LearningSession } from "../types";

const session: LearningSession = {
  kind: "words",
  lessonId: null,
  words: [],
  exercises: [{ type: "intro", wordId: "p36-03" }],
  chapterId: 1,
  verseByWord: { "p36-03": "1:1:3", "p38-08": "1:1:4", "p41-11": "1:3:1" },
  daily: { fresh: 3, review: 0 },
};
const reserve = (savedAt: number): DailyReserve => ({ savedAt, translationId: 31, session, verses: {}, contexts: {} });

beforeEach(() => mockFiles.clear());

describe("réserve de la séance du jour", () => {
  it("se relit tant qu'elle n'est pas trop ancienne", () => {
    const now = 1_000_000_000_000;
    saveDailyReserve(reserve(now - 1000));
    expect(loadDailyReserve(now)?.session.chapterId).toBe(1);
    expect(loadDailyReserve(now + RESERVE_MAX_AGE_MS)).toBeNull();
  });

  it("n'est renouvelée qu'au-delà de 6 heures", () => {
    const now = 1_000_000_000_000;
    expect(reserveNeedsRefresh(now)).toBe(true);
    saveDailyReserve(reserve(now));
    expect(reserveNeedsRefresh(now + 1000)).toBe(false);
    expect(reserveNeedsRefresh(now + RESERVE_REFRESH_MS + 1)).toBe(true);
  });

  it("est consommée une fois la séance faite", () => {
    saveDailyReserve(reserve(Date.now()));
    consumeDailyReserve();
    expect(loadDailyReserve()).toBeNull();
  });

  it("ignore une réserve vide ou illisible", () => {
    saveDailyReserve({ ...reserve(Date.now()), session: { ...session, exercises: [] } });
    expect(loadDailyReserve()).toBeNull();
    mockFiles.set("doc/daily-reserve.json", "{pas du json");
    expect(loadDailyReserve()).toBeNull();
  });

  it("garde un seul exemplaire de chaque verset des mots nouveaux", () => {
    expect(reserveVerseKeys(session)).toEqual(["1:1", "1:3"]);
  });
});
