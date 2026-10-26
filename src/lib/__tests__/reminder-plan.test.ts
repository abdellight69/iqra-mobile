/**
 * Planification des rappels : dates, textes et liens, calculés à partir des données en cache.
 */
import { dailyBody, planReminders, reminderPath, REMINDER_URLS, weeklyBody } from "../reminder-plan";

// Lundi 19 octobre 2026, 10h00 (heure locale).
const now = new Date(2026, 9, 19, 10, 0);
const time = { hour: 20, minute: 0 };
const local = (day: number, hour: number, minute = 0) => new Date(2026, 9, day, hour, minute);

describe("dailyBody", () => {
  it("combine versets à réviser et XP restants", () => {
    expect(dailyBody({ dueVerses: 1, xpRemaining: 12 })).toBe("1 verset à réviser · 12 XP restants");
    expect(dailyBody({ dueVerses: 3, xpRemaining: 0 })).toBe("3 versets à réviser");
    expect(dailyBody({ dueVerses: 0, xpRemaining: 30 })).toBe("30 XP restants");
  });

  it("garde un message d'encouragement quand il n'y a rien à compter", () => {
    expect(dailyBody({ dueVerses: 0, xpRemaining: 0 })).toMatch(/Coran/);
  });

  it("parle du contenu quand le serveur le connaît", () => {
    expect(dailyBody({ dueVerses: 2, xpRemaining: 12 }, { nearlyDone: { surahName: "Al-Ikhlâs", versesLeft: 1 } })).toBe("Plus que 1 verset pour finir Al-Ikhlâs · 12 XP restants");
    expect(dailyBody({ dueVerses: 0, xpRemaining: 0 }, { resume: { surahName: "Al-Baqara", verseNumber: 142 } })).toBe("Reprendre Al-Baqara au verset 142");
    expect(dailyBody({ dueVerses: 3, xpRemaining: 0 }, { nearlyDone: null, resume: { surahName: "An-Nâs", verseNumber: 2 } })).toBe("3 versets à réviser");
  });
});

describe("weeklyBody", () => {
  it("dit où en est la semaine", () => {
    expect(weeklyBody({ activeDays: 5, goalActiveDays: 5 })).toBe("5 jours sur 7, objectif atteint. Voir le bilan");
    expect(weeklyBody({ activeDays: 3, goalActiveDays: 5 })).toBe("3 jours sur 7 : encore 2 pour l’objectif. Voir le bilan");
    expect(weeklyBody(null)).toMatch(/bilan/);
  });
});

describe("reminderPath", () => {
  it("transforme un lien profond en chemin de l'app", () => {
    expect(reminderPath(REMINDER_URLS.memorize)).toBe("/memorize");
    expect(reminderPath(REMINDER_URLS.home)).toBe("/");
    expect(reminderPath("eqra:///memorize")).toBe("/memorize");
  });
});

describe("planReminders", () => {
  it("programme un rappel quotidien par jour, à l'heure choisie, avec le texte du jour", () => {
    const plans = planReminders({ now, time, today: { xp: 18, goalXp: 30 }, dueAts: [local(18, 9)] });
    const daily = plans.filter((p) => p.kind === "daily");
    expect(daily).toHaveLength(7);
    expect(daily[0].date).toEqual(local(19, 20));
    expect(daily[0].body).toBe("1 verset à réviser · 12 XP restants");
    expect(daily[0].url).toBe(REMINDER_URLS.memorize);
    // Les jours suivants, tout l'objectif reste à faire.
    expect(daily[1].body).toBe("1 verset à réviser · 30 XP restants");
  });

  it("saute le rappel d'aujourd'hui si l'objectif est atteint ou l'heure passée", () => {
    const reached = planReminders({ now, time, today: { xp: 30, goalXp: 30 }, dueAts: [] });
    expect(reached.filter((p) => p.kind === "daily")[0].date).toEqual(local(20, 20));
    const late = planReminders({ now: local(19, 21), time, today: { xp: 0, goalXp: 30 }, dueAts: [] });
    expect(late.filter((p) => p.kind === "daily")[0].date).toEqual(local(20, 20));
  });

  it("ouvre l'accueil quand aucun verset n'est à réviser", () => {
    const [first] = planReminders({ now, time, today: { xp: 0, goalXp: 30 }, dueAts: [] });
    expect(first.url).toBe(REMINDER_URLS.home);
    expect(first.body).toBe("30 XP restants");
  });

  it("prévient quand des versets deviennent dus, au plus une fois par jour, jamais la nuit", () => {
    const plans = planReminders({
      now,
      time,
      today: { xp: 0, goalXp: 30 },
      // Déjà dû, deux échéances demain (dont une la nuit), une après-demain tard le soir.
      dueAts: [local(18, 9), local(20, 3), local(20, 11), local(21, 23)],
    });
    const due = plans.filter((p) => p.kind === "due");
    expect(due.map((p) => p.date)).toEqual([local(20, 8), local(22, 8)]);
    // Comptes cumulés : à 8h demain, le verset déjà dû et celui de la nuit.
    expect(due[0].body).toBe("2 versets à réviser");
    expect(due[1].body).toBe("4 versets à réviser");
    expect(due[0].url).toBe(REMINDER_URLS.memorize);
  });

  it("ne double pas le rappel quotidien quand une échéance tombe à la même heure", () => {
    const plans = planReminders({ now, time, today: { xp: 0, goalXp: 30 }, dueAts: [local(20, 19, 30)] });
    expect(plans.filter((p) => p.kind === "due")).toHaveLength(0);
  });

  it("ignore les échéances passées ou au-delà de l'horizon", () => {
    const plans = planReminders({ now, time, today: { xp: 0, goalXp: 30 }, dueAts: [local(19, 9), local(30, 10)] });
    expect(plans.filter((p) => p.kind === "due")).toHaveLength(0);
  });

  it("programme le bilan du dimanche une seule fois, à 18h30, vers l'écran de la semaine", () => {
    const plans = planReminders({ now, time, today: { xp: 0, goalXp: 30 }, dueAts: [], context: { week: { activeDays: 1, goalActiveDays: 5 } } });
    const weekly = plans.filter((p) => p.kind === "weekly");
    expect(weekly).toHaveLength(1);
    expect(weekly[0].date).toEqual(local(25, 18, 30));
    expect(weekly[0].url).toBe(REMINDER_URLS.week);
    expect(reminderPath(weekly[0].url)).toBe("/week");
    // Un dimanche, le texte porte sur la semaine en cours ; les autres jours, un texte neutre.
    const sunday = planReminders({ now: local(25, 10), time, today: { xp: 0, goalXp: 30 }, dueAts: [], context: { week: { activeDays: 4, goalActiveDays: 5 } } });
    expect(sunday.find((p) => p.kind === "weekly")?.body).toBe("4 jours sur 7 : encore 1 pour l’objectif. Voir le bilan");
    expect(weekly[0].body).toBe("Votre bilan de la semaine est prêt.");
    // Pas de bilan pour un enfant.
    expect(planReminders({ now, time, today: { xp: 0, goalXp: 30 }, dueAts: [], kid: { missionDone: false } }).some((p) => p.kind === "weekly")).toBe(false);
  });

  it("rend les rappels triés par date", () => {
    const plans = planReminders({ now, time, today: { xp: 0, goalXp: 30 }, dueAts: [local(20, 10)] });
    const times = plans.map((p) => p.date.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});

describe("rappels d'un enfant", () => {
  it("programme un rappel de mission par jour, et se tait aujourd'hui si elle est faite", () => {
    const planned = planReminders({ now, time, today: { xp: 0, goalXp: 30 }, dueAts: [local(19, 12)], kid: { missionDone: false } });
    expect(planned).toHaveLength(7);
    expect(planned.every((r) => r.kind === "daily" && r.title === "Ta mission t’attend !" && r.url === REMINDER_URLS.home)).toBe(true);
    expect(planned[0]!.date).toEqual(local(19, 20));
    const done = planReminders({ now, time, today: { xp: 0, goalXp: 30 }, dueAts: [], kid: { missionDone: true } });
    expect(done[0]!.date).toEqual(local(20, 20));
  });
});
