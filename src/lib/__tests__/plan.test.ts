import { nextMilestone, nextPlanStep, type Plan, planSteps, progressLabel, progressRatio, remainingMinutes } from "../plan";

const base: Plan = {
  goal: "understand",
  target: { id: "prayer-words", title: "Comprendre sa prière", detail: "Al-Fâtiha et les dix dernières sourates", done: 120, total: 310, unit: "mots" },
  today: {
    words: { due: 4, new: 3 },
    verses: { due: 2 },
    letters: { lessonId: "l-3", title: "Les lettres qui s’attachent" },
    reading: { programId: "khatm-30", day: 12, dayCount: 30 },
    done: { words: false, verses: false, letters: false, reading: false },
    estimatedMinutes: 9,
  },
  milestones: [
    { label: "Al-Fâtiha comprise", done: true },
    { label: "Al-Ikhlâs comprise", done: false },
  ],
};

describe("plan personnel", () => {
  it("ordonne la séance du jour : mots, versets, lettres, lecture", () => {
    expect(planSteps(base).map((s) => s.kind)).toEqual(["words", "verses", "letters", "reading"]);
  });

  it("omet les étapes sans rien à faire", () => {
    const plan: Plan = { ...base, today: { ...base.today, words: { due: 0, new: 0 }, verses: { due: 0 }, letters: { lessonId: null, title: null }, reading: null } };
    expect(planSteps(plan)).toEqual([]);
    expect(nextPlanStep(plan)).toBeNull();
  });

  it("garde une étape faite aujourd'hui, marquée comme telle", () => {
    const plan: Plan = { ...base, today: { ...base.today, words: { due: 0, new: 0 }, done: { ...base.today.done, words: true } } };
    const words = planSteps(plan).find((s) => s.kind === "words");
    expect(words?.done).toBe(true);
    expect(words?.detail).toBe("Fait");
    expect(nextPlanStep(plan)?.kind).toBe("verses");
  });

  it("décrit les mots du jour en français", () => {
    expect(planSteps(base)[0]!.detail).toBe("3 mots nouveaux · 4 révisions");
    const one: Plan = { ...base, today: { ...base.today, words: { due: 1, new: 0 } } };
    expect(planSteps(one)[0]!.detail).toBe("1 révision");
  });

  it("estime les minutes restantes à partir des étapes non faites", () => {
    expect(remainingMinutes(base)).toBe(4 + 3 + 4 + 10);
    const half: Plan = { ...base, today: { ...base.today, done: { words: true, verses: true, letters: false, reading: false } } };
    expect(remainingMinutes(half)).toBe(14);
  });

  it("formule la progression et le jalon suivant", () => {
    expect(progressLabel(base.target)).toBe("120 mots sur 310");
    expect(progressRatio(base.target)).toBeCloseTo(120 / 310);
    expect(progressRatio({ ...base.target, total: 0 })).toBe(0);
    expect(nextMilestone(base)).toBe("Al-Ikhlâs comprise");
    expect(nextMilestone({ ...base, milestones: base.milestones.map((m) => ({ ...m, done: true })) })).toBeNull();
  });

  it("mène chaque étape au bon écran", () => {
    const hrefs = planSteps(base).map((s) => JSON.stringify(s.href));
    expect(hrefs[0]).toContain("/learn/session");
    expect(hrefs[1]).toContain("/memorize/session");
    expect(hrefs[2]).toContain("l-3");
    expect(hrefs[3]).toContain("khatm-30");
  });
});
