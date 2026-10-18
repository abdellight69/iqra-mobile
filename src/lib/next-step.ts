import type { Href } from "expo-router";
import type { Goal, LessonSummary, ProgramSummary, Stats } from "./types";

/** Prochaine action conseillée selon l'objectif choisi au premier lancement. */
export type NextStep = { eyebrow: string; title: string; detail: string; href: Href; programId?: string };

export function nextStep(
  goal: Goal | null | undefined,
  data: { programs?: ProgramSummary[]; lessons?: LessonSummary[]; stats?: Stats },
): NextStep | null {
  const active = (kind: ProgramSummary["kind"]) => data.programs?.find((p) => p.kind === kind && p.progress && !p.progress.finished);
  const programStep = (p: ProgramSummary): NextStep => ({
    eyebrow: "Votre programme",
    title: p.title,
    detail: `Jour ${p.progress?.nextDay} sur ${p.dayCount}`,
    href: { pathname: "/programs/[id]", params: { id: p.id } },
    programId: p.id,
  });

  if (goal === "memorize") {
    const program = active("memorize");
    if (program) return programStep(program);
    const due = data.stats?.memorization.due ?? 0;
    if (due > 0) return { eyebrow: "Mémoriser", title: `Réviser ${due} verset${due > 1 ? "s" : ""}`, detail: "Révisions du jour", href: { pathname: "/memorize/session", params: { due: "1" } } };
    return { eyebrow: "Pour commencer", title: "Juz’ ‘Amma en 60 jours", detail: "Environ 10 versets par jour", href: { pathname: "/programs/[id]", params: { id: "juz-amma-60" } } };
  }
  if (goal === "understand") {
    const lesson = data.lessons?.find((l) => l.unlocked && !l.completed);
    if (lesson) return { eyebrow: "Vocabulaire", title: lesson.title.replace(/^[A-Z] - /, ""), detail: `${lesson.learnedCount}/${lesson.wordCount} mots appris`, href: { pathname: "/learn/[lessonId]", params: { lessonId: lesson.id } } };
    return { eyebrow: "Comprendre", title: "Comprendre sa prière", detail: "Al-Fâtiha et les dix dernières sourates", href: "/prayer" };
  }
  if (goal === "read") {
    const program = active("read");
    if (program) return programStep(program);
    return { eyebrow: "Lire", title: "Lire le Coran en 30 jours", detail: "Un juz’ par jour", href: { pathname: "/programs/[id]", params: { id: "khatm-30" } } };
  }
  return null;
}
