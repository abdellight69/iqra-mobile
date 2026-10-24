import { type ChildInsights, hasStarted, summarizeSurahs, templateSummary, verseRange, verseReference, weekBars } from "../child-insights";
import type { Chapter } from "../types";

const chapter = (id: number, nameSimple: string, versesCount: number) => ({ id, nameSimple, versesCount }) as Chapter;
const chapters = [chapter(1, "Al-Fatiha", 7), chapter(112, "Al-Ikhlas", 4), chapter(113, "Al-Falaq", 5), chapter(114, "An-Nas", 6)];

describe("fiche enfant : sourates", () => {
  it("libelle chaque sourate avec ses versets sus et la récitation sans erreur", () => {
    const [ikhlas] = summarizeSurahs([{ chapterId: 112, versesCount: 4, tracked: 4, solid: 3, recitedOk: 4 }], chapters);
    expect(ikhlas).toMatchObject({ name: "Al-Ikhlas", solid: 3, total: 4, recitedOk: true, label: "3 versets sur 4, récitée sans erreur" });
    expect(ikhlas!.progress).toBeCloseTo(0.75);
  });

  it("met le singulier et ne signale pas la récitation tant qu'un verset n'est pas récité sans erreur", () => {
    const [falaq] = summarizeSurahs([{ chapterId: 113, versesCount: 5, tracked: 2, solid: 1, recitedOk: 4 }], chapters);
    expect(falaq!.label).toBe("1 verset sur 5");
    expect(falaq!.recitedOk).toBe(false);
  });

  it("trie les plus avancées d'abord, puis l'ordre du Coran, et nomme la sourate par son numéro sans liste", () => {
    const sorted = summarizeSurahs(
      [
        { chapterId: 1, versesCount: 7, tracked: 7, solid: 7, recitedOk: 0 },
        { chapterId: 114, versesCount: 6, tracked: 3, solid: 3, recitedOk: 0 },
        { chapterId: 112, versesCount: 4, tracked: 2, solid: 2, recitedOk: 0 },
      ],
      undefined,
    );
    expect(sorted.map((s) => s.chapterId)).toEqual([1, 112, 114]);
    expect(sorted[0]!.name).toBe("Sourate 1");
    expect(sorted[0]!.label).toBe("7 versets sur 7");
  });

  it("borne les versets sus au total de la sourate", () => {
    const [s] = summarizeSurahs([{ chapterId: 112, versesCount: 4, tracked: 4, solid: 9, recitedOk: 9 }], chapters);
    expect(s!.solid).toBe(4);
    expect(s!.progress).toBe(1);
    expect(s!.recitedOk).toBe(true);
  });
});

describe("fiche enfant : semaine", () => {
  it("donne sept barres jusqu'à aujourd'hui, les jours sans activité à zéro", () => {
    const bars = weekBars(
      [
        { day: "2026-10-18", xp: 20 },
        { day: "2026-10-24", xp: 5 },
      ],
      "2026-10-24",
    );
    expect(bars).toHaveLength(7);
    expect(bars[0]).toEqual({ day: "2026-10-18", letter: "Di", xp: 20, today: false });
    expect(bars.map((b) => b.letter)).toEqual(["Di", "Lu", "Ma", "Me", "Je", "Ve", "Sa"]);
    expect(bars.map((b) => b.xp)).toEqual([20, 0, 0, 0, 0, 0, 5]);
    expect(bars[6]!.today).toBe(true);
  });

  it("passe un changement de mois sans trou", () => {
    const bars = weekBars([], "2026-11-02");
    expect(bars.map((b) => b.day)).toEqual(["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  });
});

describe("fiche enfant : mots qui bloquent et modèles", () => {
  it("résume les sourates d'un modèle avec le nombre de versets", () => {
    const ranges = [
      { chapterId: 112, fromVerse: 1, toVerse: 4 },
      { chapterId: 113, fromVerse: 1, toVerse: 5 },
      { chapterId: 114, fromVerse: 1, toVerse: 6 },
    ];
    expect(templateSummary(ranges, chapters)).toBe("Al-Ikhlas, Al-Falaq, An-Nas · 15 versets");
    expect(templateSummary([{ chapterId: 112, fromVerse: 2, toVerse: 2 }], undefined)).toBe("Sourate 112 · 1 verset");
  });

  it("transforme la clé d'un verset en référence lisible et en plage de mission", () => {
    expect(verseReference("112:2", chapters)).toBe("Al-Ikhlas, verset 2");
    expect(verseReference("99:1", undefined)).toBe("Sourate 99, verset 1");
    expect(verseRange("112:2")).toEqual({ chapterId: 112, fromVerse: 2, toVerse: 2 });
    expect(verseRange("abc")).toBeNull();
    expect(verseRange("112:0")).toBeNull();
  });

  it("sait si l'enfant a commencé", () => {
    const empty: ChildInsights = {
      child: { id: "c1", displayName: "Nour", avatar: "blue" },
      surahs: [],
      words: { learned: 0, mastered: 0, recent: [] },
      weakWords: [],
      activity: { streak: 0, last7Days: [] },
      missions: { completedDays: 0, stars: 0, currentTitle: null },
    };
    expect(hasStarted(empty)).toBe(false);
    expect(hasStarted({ ...empty, words: { learned: 1, mastered: 0, recent: [] } })).toBe(true);
    expect(hasStarted({ ...empty, activity: { streak: 0, last7Days: [{ day: "2026-10-24", xp: 10 }] } })).toBe(true);
  });
});
