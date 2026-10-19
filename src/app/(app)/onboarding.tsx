import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState, type ComponentProps } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { SafeArea } from "@/components/SafeArea";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { ProgressBar } from "@/components/ProgressBar";
import { api, errorMessage } from "@/lib/api";
import { useUpdateMe } from "@/lib/queries";
import { useReaderSettings } from "@/lib/reader-store";
import { formatTime, REMINDER_TIMES, requestReminderPermission, useReminders } from "@/lib/reminders";
import { radius, spacing, useColors } from "@/lib/theme";
import type { ArabicLevel, Goal } from "@/lib/types";

type Icon = ComponentProps<typeof Ionicons>["name"];

const GOALS: { value: Goal; icon: Icon; title: string; detail: string }[] = [
  { value: "understand", icon: "bulb-outline", title: "Comprendre le sens", detail: "Le vocabulaire du Coran, mot à mot" },
  { value: "memorize", icon: "repeat", title: "Mémoriser", detail: "Des sourates, avec des révisions espacées" },
  { value: "read", icon: "book-outline", title: "Lire régulièrement", detail: "Un peu chaque jour, à votre rythme" },
];

const LEVELS: { value: ArabicLevel; title: string; detail: string }[] = [
  { value: "none", title: "Je ne lis pas encore l’arabe", detail: "La phonétique et le mot à mot vous accompagneront" },
  { value: "beginner", title: "Je lis lentement", detail: "Lettre par lettre, avec hésitations" },
  { value: "fluent", title: "Je lis couramment", detail: "Le texte arabe ne me pose pas de difficulté" },
];

const GOALS_XP = [10, 30, 50];

/** Ce qui est proposé à la fin, selon l'objectif et le niveau. */
function recommendation(goal: Goal, level: ArabicLevel): { title: string; detail: string; programId?: string; route?: "/learn" | "/prayer" | "/reading" } {
  if (level === "none") {
    return { title: "Apprendre à lire l’arabe", detail: "Les lettres, les voyelles, puis Al-Fâtiha et les dernières sourates, avec la récitation de chaque mot.", route: "/reading" };
  }
  if (goal === "memorize") {
    return level === "fluent"
      ? { title: "Juz’ ‘Amma en 30 jours", detail: "Environ 19 versets par jour, d’An-Nâs à An-Naba’ (ordre inverse du Mushaf).", programId: "juz-amma-30" }
      : { title: "Juz’ ‘Amma en 60 jours", detail: "Environ 10 versets par jour, d’An-Nâs à An-Naba’ (ordre inverse du Mushaf).", programId: "juz-amma-60" };
  }
  if (goal === "read") {
    return level === "fluent"
      ? { title: "Lire le Coran en 30 jours", detail: "Un juz’ par jour, d’Al-Fâtiha à An-Nâs.", programId: "khatm-30" }
      : { title: "Comprendre sa prière", detail: "Al-Fâtiha et les dix dernières sourates, mot à mot, avec la phonétique.", route: "/prayer" };
  }
  return { title: "Les mots les plus fréquents du Coran", detail: "Une première leçon de vocabulaire, puis le pourcentage de chaque sourate que vous reconnaissez.", route: "/learn" };
}

export default function Onboarding() {
  const colors = useColors();
  const update = useUpdateMe();
  const reminders = useReminders();
  const [step, setStep] = useState(0);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [level, setLevel] = useState<ArabicLevel | null>(null);
  const [dailyGoalXp, setDailyGoalXp] = useState(30);
  const [reminder, setReminder] = useState<{ hour: number; minute: number } | null>(null);
  const [starting, setStarting] = useState(false);

  /** Enregistre les réponses (ou, en passant l'étape, seulement le fait de l'avoir vue). */
  async function finish(goTo?: () => void, skipped = false) {
    try {
      await update.mutateAsync(skipped ? { onboarded: true } : { goal, arabicLevel: level, dailyGoalXp, onboarded: true });
      // Sans lecture de l'arabe : le mot à mot (phonétique et sens sous chaque mot) est activé.
      if (level === "none") useReaderSettings.setState({ showWordByWord: true, showTransliteration: true });
      if (reminder && (await requestReminderPermission())) await reminders.update({ enabled: true, ...reminder });
      router.replace("/");
      goTo?.();
    } catch (error) {
      Alert.alert("Enregistrement impossible", errorMessage(error));
    }
  }

  async function startRecommended() {
    if (!goal || !level) return;
    const rec = recommendation(goal, level);
    setStarting(true);
    try {
      if (rec.programId) await api(`/programs/${rec.programId}/start`, { method: "POST" });
      await finish(() => {
        if (rec.programId) router.push({ pathname: "/programs/[id]", params: { id: rec.programId } });
        else if (rec.route) router.push(rec.route);
      });
    } catch (error) {
      Alert.alert("Action impossible", errorMessage(error));
    } finally {
      setStarting(false);
    }
  }

  const rec = goal && level ? recommendation(goal, level) : null;

  return (
    <SafeArea style={[styles.flex, { backgroundColor: colors.background }]}>
      <View style={styles.top}>
        {step > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Retour" hitSlop={10} onPress={() => setStep(step - 1)}>
            <Ionicons name="chevron-back" size={26} color={colors.textMuted} />
          </Pressable>
        ) : (
          <View style={styles.backSpace} />
        )}
        <View style={styles.flex}>
          <ProgressBar value={(step + 1) / 4} height={6} color={colors.accent} />
        </View>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={() => void finish(undefined, true)}>
          <AppText variant="caption" muted>
            Plus tard
          </AppText>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {step === 0 ? (
          <>
            <BrandMark size={44} color={colors.accent} />
            <AppText variant="display">Bienvenue</AppText>
            <AppText muted>Quel est votre objectif principal ? Vous pourrez tout utiliser ensuite.</AppText>
            {GOALS.map((g) => (
              <Option key={g.value} icon={g.icon} title={g.title} detail={g.detail} selected={goal === g.value} onPress={() => setGoal(g.value)} />
            ))}
          </>
        ) : step === 1 ? (
          <>
            <AppText variant="display">Votre lecture de l’arabe</AppText>
            <AppText muted>Pour adapter l’affichage du texte.</AppText>
            {LEVELS.map((l) => (
              <Option key={l.value} title={l.title} detail={l.detail} selected={level === l.value} onPress={() => setLevel(l.value)} />
            ))}
            {level === "none" ? (
              <AppText variant="caption" muted>
                Eqra vous apprend à lire : les lettres, les voyelles, puis vos premières sourates. En attendant, chaque verset est accompagné de sa phonétique.
              </AppText>
            ) : null}
          </>
        ) : step === 2 ? (
          <>
            <AppText variant="display">Votre rythme</AppText>
            <AppText variant="label" muted>
              Objectif quotidien
            </AppText>
            <View style={styles.chips}>
              {GOALS_XP.map((xp) => (
                <Chip key={xp} label={`${xp} XP`} detail={xp === 10 ? "5 min" : xp === 30 ? "15 min" : "25 min"} selected={dailyGoalXp === xp} onPress={() => setDailyGoalXp(xp)} />
              ))}
            </View>
            {Platform.OS !== "web" ? (
              <>
                <AppText variant="label" muted>
                  Rappel quotidien
                </AppText>
                <View style={styles.chips}>
                  <Chip label="Aucun" selected={reminder === null} onPress={() => setReminder(null)} />
                  {REMINDER_TIMES.map((t) => (
                    <Chip
                      key={formatTime(t.hour, t.minute)}
                      label={formatTime(t.hour, t.minute)}
                      selected={reminder?.hour === t.hour && reminder.minute === t.minute}
                      onPress={() => setReminder(t)}
                    />
                  ))}
                </View>
                <AppText variant="caption" muted>
                  Seulement les jours où vous n’avez pas encore pratiqué.
                </AppText>
              </>
            ) : null}
          </>
        ) : rec ? (
          <>
            <AppText variant="display">Votre point de départ</AppText>
            <View style={[styles.rec, { backgroundColor: colors.hero }]}>
              <AppText variant="label" color="#FFFFFF99">
                Nous vous proposons
              </AppText>
              <AppText variant="title" color="#FFFFFF">
                {rec.title}
              </AppText>
              <AppText color="#FFFFFFCC">{rec.detail}</AppText>
            </View>
            <AppText variant="caption" muted>
              Tout reste accessible : lecture, mémorisation, vocabulaire et parcours, depuis l’accueil et les onglets.
            </AppText>
          </>
        ) : null}
      </ScrollView>

      <View style={styles.cta}>
        {step < 3 ? (
          <Button title="Continuer" disabled={(step === 0 && !goal) || (step === 1 && !level)} onPress={() => setStep(step + 1)} />
        ) : (
          <>
            <Button title={rec?.programId ? "Commencer le programme" : "C’est parti"} loading={starting || update.isPending} onPress={() => void startRecommended()} />
            <Button title="Aller à l’accueil" variant="ghost" onPress={() => void finish()} />
          </>
        )}
      </View>
    </SafeArea>
  );
}

function Option({ icon, title, detail, selected, onPress }: { icon?: Icon; title: string; detail: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.option, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface }]}>
      {icon ? <Ionicons name={icon} size={22} color={selected ? colors.primary : colors.textMuted} /> : null}
      <View style={styles.flex}>
        <AppText variant="bodyStrong" color={selected ? colors.primary : colors.text}>
          {title}
        </AppText>
        <AppText variant="caption" muted>
          {detail}
        </AppText>
      </View>
      <Ionicons name={selected ? "checkmark-circle" : "ellipse-outline"} size={22} color={selected ? colors.primary : colors.border} />
    </Pressable>
  );
}

function Chip({ label, detail, selected, onPress }: { label: string; detail?: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface }]}>
      <AppText variant="bodyStrong" color={selected ? colors.primary : colors.text}>
        {label}
      </AppText>
      {detail ? (
        <AppText variant="caption" muted>
          {detail}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  backSpace: { width: 26 },
  content: { padding: spacing.lg, gap: spacing.md },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderWidth: 1.5, borderRadius: radius.lg, padding: spacing.lg },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: { minWidth: 72, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderRadius: radius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  rec: { borderRadius: radius.lg, padding: spacing.xl, gap: spacing.sm },
  cta: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, gap: spacing.xs },
});
