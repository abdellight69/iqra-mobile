/* eslint-disable import/first -- les mocks Jest doivent précéder les imports */
jest.mock("expo-secure-store", () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => undefined) }));
jest.mock("expo-router", () => ({ useFocusEffect: jest.fn() }));
jest.mock("expo", () => ({ useEventListener: jest.fn() }));
jest.mock("expo-audio", () => ({ useAudioPlayer: jest.fn(), useAudioPlayerStatus: jest.fn(), createAudioPlayer: jest.fn() }));
jest.mock("expo-speech", () => ({ speak: jest.fn(), stop: jest.fn(async () => undefined) }));

import * as SecureStore from "expo-secure-store";
import * as Speech from "expo-speech";
import { parseToggle } from "../kid-settings";
import { speak, stopSpeaking, useKidsVoice } from "../kid-voice";

const spoken = Speech.speak as jest.Mock;
const stopped = Speech.stop as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  useKidsVoice.setState({ enabled: true });
});

describe("voix des consignes", () => {
  it("lit la consigne une fois, en français", () => {
    speak("Écoute bien.");
    expect(spoken).toHaveBeenCalledTimes(1);
    expect(spoken).toHaveBeenCalledWith("Écoute bien.", expect.objectContaining({ language: "fr-FR" }));
  });

  it("interrompt la consigne précédente avant d'en lire une autre", () => {
    speak("Première consigne.");
    speak("Deuxième consigne.");
    expect(stopped).toHaveBeenCalledTimes(2);
    expect(spoken).toHaveBeenCalledTimes(2);
    expect(spoken.mock.calls[1]![0]).toBe("Deuxième consigne.");
    // L'arrêt précède toujours la lecture.
    expect(stopped.mock.invocationCallOrder[1]).toBeLessThan(spoken.mock.invocationCallOrder[1]!);
  });

  it("ne lit rien quand un parent a coupé la voix, ni quand le texte est vide", () => {
    useKidsVoice.getState().setEnabled(false);
    speak("Écoute bien.");
    expect(spoken).not.toHaveBeenCalled();
    useKidsVoice.getState().setEnabled(true);
    speak("   ");
    expect(spoken).not.toHaveBeenCalled();
  });

  it("tasse les espaces et retours à la ligne de la consigne", () => {
    speak("  Écoute,\n puis   répète.  ");
    expect(spoken.mock.calls[0]![0]).toBe("Écoute, puis répète.");
  });

  it("s'arrête quand l'écran est quitté", () => {
    speak("Écoute bien.");
    stopped.mockClear();
    stopSpeaking();
    expect(stopped).toHaveBeenCalledTimes(1);
  });

  it("garde le choix du parent sur l'appareil (\"1\" / \"0\"), actif par défaut", () => {
    useKidsVoice.getState().setEnabled(false);
    expect(SecureStore.setItemAsync).toHaveBeenLastCalledWith("iqra.kidsVoice", "0");
    useKidsVoice.getState().setEnabled(true);
    expect(SecureStore.setItemAsync).toHaveBeenLastCalledWith("iqra.kidsVoice", "1");
    expect(parseToggle(null)).toBe(true);
    expect(parseToggle("1")).toBe(true);
    expect(parseToggle("0")).toBe(false);
  });
});
