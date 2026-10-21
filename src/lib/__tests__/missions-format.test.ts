import { countVerses, dayLabel, duration, kidMissionTitle, missionSummary, planTitle, STICKERS, stickersUnlocked, todayLine, versesLabel } from "../missions-format";
import type { Chapter } from "../types";

const chapter = (id: number, nameSimple: string, versesCount: number) => ({ id, nameSimple, versesCount }) as Chapter;
const chapters = [chapter(2, "Al-Baqarah", 286), chapter(112, "Al-Ikhlas", 4), chapter(113, "Al-Falaq", 5)];

describe("missions : titres et rythme", () => {
  it("nomme la mission d'après ses sourates, sauf titre donné", () => {
    expect(planTitle({ title: null, ranges: [{ chapterId: 112, fromVerse: 1, toVerse: 4 }] }, chapters)).toBe("Sourate Al-Ikhlas");
    expect(planTitle({ title: null, ranges: [{ chapterId: 2, fromVerse: 1, toVerse: 5 }] }, chapters)).toBe("Sourate Al-Baqarah, versets 1 à 5");
    expect(planTitle({ title: null, ranges: [{ chapterId: 2, fromVerse: 255, toVerse: 255 }] }, chapters)).toBe("Sourate Al-Baqarah, verset 255");
    expect(
      planTitle(
        {
          title: null,
          ranges: [
            { chapterId: 112, fromVerse: 1, toVerse: 4 },
            { chapterId: 113, fromVerse: 1, toVerse: 5 },
          ],
        },
        chapters,
      ),
    ).toBe("Sourate Al-Ikhlas et 1 autre");
    expect(planTitle({ title: "Ma première sourate", ranges: [{ chapterId: 112, fromVerse: 1, toVerse: 4 }] }, chapters)).toBe("Ma première sourate");
    // Liste des sourates pas encore chargée : le numéro suffit.
    expect(planTitle({ title: null, ranges: [{ chapterId: 112, fromVerse: 1, toVerse: 4 }] }, undefined)).toBe("Sourate 112");
  });

  it("compte les versets et les missions du jour", () => {
    expect(countVerses([{ chapterId: 112, fromVerse: 1, toVerse: 4 }, { chapterId: 113, fromVerse: 2, toVerse: 3 }])).toBe(6);
    expect(missionSummary(4, 1, [1, 2, 4, 5])).toBe("4 missions · 4 jours par semaine");
    expect(missionSummary(5, 2, [1, 2, 3, 4, 5, 6, 7])).toBe("3 missions · tous les jours");
    expect(missionSummary(1, 3, [6])).toBe("1 mission · 1 jour par semaine");
  });

  it("écrit la durée d'un vocal", () => {
    expect(duration(18_400)).toBe("0:18");
    expect(duration(90_000)).toBe("1:30");
  });
});

describe("missions : la journée de l'enfant, vue du parent", () => {
  const today = "2026-10-21";

  it("dit aujourd'hui, demain, ou le jour en toutes lettres", () => {
    expect(dayLabel(today, today)).toBe("aujourd’hui");
    expect(dayLabel("2026-10-22", today)).toBe("demain");
    expect(dayLabel("2026-10-26", today)).toBe("lundi 26 octobre");
  });

  it("résume la mission du jour", () => {
    expect(todayLine({ kind: "mission", dayIndex: 2, verses: ["112:2"], completed: false }, 4, today)).toBe("Mission du jour à faire : jour 2 sur 4");
    expect(todayLine({ kind: "mission", dayIndex: 2, verses: ["112:2"], completed: true }, 4, today)).toBe("Mission du jour réussie (jour 2 sur 4)");
    expect(todayLine({ kind: "none", reason: "rest_day", nextMissionOn: "2026-10-22" }, 4, today)).toBe("Jour de repos, prochaine mission demain");
    expect(todayLine({ kind: "none", reason: "paused", nextMissionOn: null }, 4, today)).toBe("En pause");
    expect(todayLine({ kind: "none", reason: "finished", nextMissionOn: null }, 4, today)).toBe("Mission terminée");
  });
});

describe("missions : côté enfant", () => {
  it("nomme les versets du jour", () => {
    expect(versesLabel(["112:1"])).toBe("Verset 1");
    expect(versesLabel(["112:1", "112:2"])).toBe("Versets 1 et 2");
    expect(versesLabel(["2:1", "2:2", "2:3"])).toBe("Versets 1 à 3");
  });

  it("donne un titre à la mission, celui du parent d'abord", () => {
    expect(kidMissionTitle(null, ["112:1"], chapters)).toBe("Sourate Al-Ikhlas");
    expect(kidMissionTitle("Ma première sourate", ["112:1"], chapters)).toBe("Ma première sourate");
    expect(kidMissionTitle(null, ["112:1"], undefined)).toBe("Ta mission");
  });

  it("débloque un autocollant toutes les 5 étoiles, jusqu'à la collection complète", () => {
    expect(stickersUnlocked(0)).toBe(0);
    expect(stickersUnlocked(4)).toBe(0);
    expect(stickersUnlocked(5)).toBe(1);
    expect(stickersUnlocked(23)).toBe(4);
    expect(stickersUnlocked(1000)).toBe(STICKERS.length);
  });
});
