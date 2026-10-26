import { compareWeeks, type Week, weekdayIndex, weekHeadline, weekLabel, weekMessage, weekSummary } from "../week";

const week: Week = {
  weekStart: "2026-10-19",
  weekEnd: "2026-10-25",
  goalActiveDays: 5,
  days: [],
  totals: { xp: 180, activeDays: 5, wordsLearned: 12, versesLearned: 3, versesRead: 40 },
  previous: { xp: 120, activeDays: 4, wordsLearned: 8, versesLearned: 3, versesRead: 60 },
  streak: 5,
  goalReached: true,
};

describe("bilan de la semaine", () => {
  it("libelle la semaine, dans un mois ou à cheval", () => {
    expect(weekLabel("2026-10-19", "2026-10-25")).toBe("Semaine du 19 au 25 octobre");
    expect(weekLabel("2026-10-26", "2026-11-01")).toBe("Semaine du 26 octobre au 1 novembre");
  });

  it("titre le bilan selon l'objectif", () => {
    expect(weekHeadline(week)).toBe("5 jours sur 7, objectif atteint");
    expect(weekHeadline({ ...week, goalReached: false, totals: { ...week.totals, activeDays: 1 } })).toBe("1 jour sur 7, objectif : 5");
  });

  it("résume ce qui a été appris", () => {
    expect(weekSummary(week.totals)).toBe("12 mots appris · 3 versets mémorisés · 40 versets lus");
    expect(weekSummary({ xp: 20, activeDays: 1, wordsLearned: 0, versesLearned: 0, versesRead: 0 })).toBe("20 XP");
    expect(weekSummary({ xp: 0, activeDays: 0, wordsLearned: 0, versesLearned: 0, versesRead: 0 })).toBe("");
  });

  it("compare avec la semaine d'avant", () => {
    const rows = compareWeeks(week.totals, week.previous);
    expect(rows.map((r) => r.trend)).toEqual(["up", "up", "up", "same"]);
    expect(rows[0]).toEqual({ label: "Jours pratiqués", current: 5, previous: 4, trend: "up" });
  });

  it("encourage sans mentir", () => {
    expect(weekMessage(week, 6)).toMatch(/atteint/);
    const behind: Week = { ...week, goalReached: false, totals: { ...week.totals, activeDays: 2 } };
    expect(weekMessage(behind, 2)).toBe("Encore 3 jours de pratique pour atteindre votre objectif, il reste 5 jours.");
    expect(weekMessage(behind, 5)).toMatch(/ne sera pas atteint/);
  });

  it("numérote les jours du lundi (0) au dimanche (6)", () => {
    expect(weekdayIndex(new Date(2026, 9, 19))).toBe(0);
    expect(weekdayIndex(new Date(2026, 9, 25))).toBe(6);
  });
});
