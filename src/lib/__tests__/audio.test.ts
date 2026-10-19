/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
jest.mock("expo", () => ({ useEventListener: jest.fn() }));
jest.mock("expo-audio", () => ({ useAudioPlayer: jest.fn(), useAudioPlayerStatus: jest.fn() }));

import { wordAt } from "../audio";

// Minutage réel d'Al-Fâtiha 1:1 (Quran.com, al-Afasy) : [début, fin] en ms, 4 mots.
const words = [
  { position: 1, startMs: 60, endMs: 610 },
  { position: 2, startMs: 620, endMs: 1310 },
  { position: 3, startMs: 1320, endMs: 2450 },
  { position: 4, startMs: 2460, endMs: 5970 },
];

describe("wordAt : mot en cours de récitation", () => {
  it("renvoie le mot dont la plage contient l'instant", () => {
    expect(wordAt(words, 100)).toBe(1);
    expect(wordAt(words, 1320)).toBe(3);
    expect(wordAt(words, 5000)).toBe(4);
  });

  it("garde le dernier mot commencé pendant un court silence (≤ 300 ms)", () => {
    expect(wordAt(words, 615)).toBe(1);
    expect(wordAt(words, 1312)).toBe(2);
  });

  it("ne surligne rien avant le premier mot ni longtemps après le dernier", () => {
    expect(wordAt(words, 0)).toBeNull();
    expect(wordAt(words, 5970 + 301)).toBeNull();
  });

  it("ne surligne rien sans minutage", () => {
    expect(wordAt(undefined, 1000)).toBeNull();
    expect(wordAt([], 1000)).toBeNull();
  });
});
