import { daysLeft, familiesSummary, formatCode, fraction, goalTitle, localDay, parseJoinInput, quantity } from "../families-format";

describe("familles : titres et quantités", () => {
  it("accorde au pluriel et lit les grands nombres à la française", () => {
    expect(quantity("verses_read", 1)).toBe("1 verset lu");
    expect(quantity("words_learned", 20)).toBe("20 mots appris");
    expect(quantity("xp", 1500)).toBe("1 500 XP");
  });

  it("génère un titre selon la portée, sauf titre libre", () => {
    const goal = { title: null, metric: "words_learned", target: 20, period: "week", scope: "each" } as const;
    expect(goalTitle(goal)).toBe("Chacun : 20 mots appris par semaine");
    expect(goalTitle({ ...goal, scope: "shared", metric: "verses_read", target: 200, period: "month" })).toBe("Ensemble : 200 versets lus par mois");
    expect(goalTitle({ ...goal, scope: "assigned" }, ["Amina"])).toBe("Amina : 20 mots appris par semaine");
    expect(goalTitle({ ...goal, scope: "assigned" }, ["Amina", "Bilal"])).toBe("Amina et Bilal : 20 mots appris par semaine");
    expect(goalTitle({ ...goal, scope: "assigned" }, ["A", "B", "C"])).toBe("3 personnes : 20 mots appris par semaine");
    expect(goalTitle({ ...goal, title: "Mots du Ramadan" })).toBe("Mots du Ramadan");
  });

  it("borne la progression et compte les jours restants, aujourd'hui compris", () => {
    expect(fraction(15, 10)).toBe(1);
    expect(fraction(-1, 10)).toBe(0);
    expect(fraction(5, 0)).toBe(0);
    expect(daysLeft("2026-10-25", "2026-10-22")).toBe(4);
    expect(daysLeft("2026-10-25", "2026-10-25")).toBe(1);
    expect(daysLeft("2026-10-25", "2026-10-27")).toBe(0);
    expect(localDay(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
  });
});

describe("familles : rejoindre avec un code ou un lien collé", () => {
  it("reconnaît le lien d'invitation, le lien avec code et le code seul", () => {
    expect(parseJoinInput("http://46.202.159.87/rejoindre/?t=AbCdEfGhIjKlMnOp_-qr")).toEqual({ token: "AbCdEfGhIjKlMnOp_-qr" });
    expect(parseJoinInput("eqra://famille/rejoindre?c=K7Q2M9XD")).toEqual({ code: "K7Q2M9XD" });
    expect(parseJoinInput(" k7q2-m9xd ")).toEqual({ code: "K7Q2M9XD" });
    expect(parseJoinInput("bonjour")).toBeNull();
    expect(formatCode("k7q2m9xd")).toBe("K7Q2-M9XD");
  });
});

describe("familles : résumé pour l'Accueil", () => {
  it("additionne les familles et se tait quand il n'y a rien", () => {
    expect(familiesSummary([])).toBeNull();
    expect(familiesSummary([{ activeGoals: 0, pendingGoals: 0, unseenEncouragements: 0 }])).toBeNull();
    expect(
      familiesSummary([
        { activeGoals: 1, pendingGoals: 1, unseenEncouragements: 0 },
        { activeGoals: 1, pendingGoals: 0, unseenEncouragements: 2 },
      ]),
    ).toBe("2 objectifs en cours · 1 à accepter · 2 encouragements");
    expect(familiesSummary([], 1)).toBe("1 invitation à rejoindre");
  });
});
