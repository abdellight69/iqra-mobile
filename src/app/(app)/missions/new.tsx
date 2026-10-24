import Ionicons from "@expo/vector-icons/Ionicons";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { VoiceNoteField } from "@/components/VoiceNote";
import { ApiError, errorMessage } from "@/lib/api";
import { type MissionTemplate, templateSummary, useMissionTemplates } from "@/lib/child-insights";
import { type MissionPlanInput, useCreateMissionPlan, useMissionChildren } from "@/lib/missions";
import { countVerses, MAX_MISSION_VERSES, missionSummary, SHORT_SURAHS, STEPS, WEEKDAYS } from "@/lib/missions-format";
import { useChapters, useMe } from "@/lib/queries";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { Chapter, MissionRange, MissionStep } from "@/lib/types";
import type { VoiceNote } from "@/lib/voice-note";

/** Préparer une mission pour un enfant : versets, étapes, rythme et un mot du parent. */
export default function NewMission() {
  const colors = useColors();
  const me = useMe();
  const chapters = useChapters();
  const children = useMissionChildren();
  const create = useCreateMissionPlan();
  const templates = useMissionTemplates();
  // chapterId/fromVerse/toVerse : plage pré-remplie depuis la fiche de l'enfant (« En faire une mission »).
  const params = useLocalSearchParams<{ childId?: string; chapterId?: string; fromVerse?: string; toVerse?: string }>();

  const [pickedChild, setChild] = useState<string | null>(null);
  const [pickedChapter, setChapter] = useState<Chapter | null>(null);
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"whole" | "range">(params.fromVerse || params.toVerse ? "range" : "whole");
  const [from, setFrom] = useState(params.fromVerse ?? "1");
  const [to, setTo] = useState(params.toVerse ?? "");
  const [steps, setSteps] = useState<MissionStep[]>(["listen", "repeat", "play"]);
  const [versesPerDay, setVersesPerDay] = useState(1);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [message, setMessage] = useState("");
  const [voice, setVoice] = useState<VoiceNote | null>(null);
  const [pinRequired, setPinRequired] = useState(false);
  // Mission prête à plusieurs sourates : le formulaire ne sait choisir qu'une sourate, on garde les plages du modèle telles quelles.
  const [templateRanges, setTemplateRanges] = useState<MissionRange[] | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (chapters.data ?? []).filter((c) => !q || String(c.id) === q || c.nameSimple.toLowerCase().includes(q));
  }, [chapters.data, query]);

  // Sourate venue de l'URL : elle sert tant que le parent n'en choisit pas une autre.
  const urlChapter = useMemo(() => (params.chapterId ? (chapters.data?.find((c) => c.id === Number(params.chapterId)) ?? null) : null), [chapters.data, params.chapterId]);
  const chapter = pickedChapter ?? urlChapter;

  if (chapters.isPending || children.isPending) return <LoadingState />;
  if (chapters.isError) return <ErrorState error={chapters.error} onRetry={() => void chapters.refetch()} />;
  if (children.isError) return <ErrorState error={children.error} onRetry={() => void children.refetch()} />;

  const childId = pickedChild ?? params.childId ?? (children.data.length === 1 ? children.data[0]!.id : null);
  const child = children.data.find((c) => c.id === childId) ?? null;
  const name = child?.displayName ?? "votre enfant";

  const fromN = Number(from);
  const toN = Number(to);
  const rangeValid = chapter !== null && Number.isInteger(fromN) && Number.isInteger(toN) && fromN >= 1 && toN <= chapter.versesCount && fromN <= toN;
  const total = templateRanges ? countVerses(templateRanges) : chapter ? (mode === "whole" ? chapter.versesCount : rangeValid ? toN - fromN + 1 : 0) : 0;
  const tooLong = total > MAX_MISSION_VERSES;
  const ready = child !== null && (chapter !== null || templateRanges !== null) && total > 0 && !tooLong && steps.length > 0 && weekdays.length > 0;

  function choose(c: Chapter) {
    setChapter(c);
    setTo(String(c.versesCount));
    setFrom("1");
    setMode("whole");
    setPicking(false);
    setQuery("");
    setTemplateRanges(null);
    setTemplateId(null);
  }

  /** Une mission prête : sourate(s), plage, rythme, jours et étapes du modèle remplissent le formulaire. */
  function applyTemplate(t: MissionTemplate) {
    setTemplateId(t.id);
    setSteps(t.steps);
    setVersesPerDay(t.versesPerDay);
    setWeekdays(t.weekdays);
    setPicking(false);
    setQuery("");
    const [first] = t.ranges;
    const single = t.ranges.length === 1 && first ? chapters.data?.find((c) => c.id === first.chapterId) : undefined;
    if (single && first) {
      setChapter(single);
      setFrom(String(first.fromVerse));
      setTo(String(first.toVerse));
      setMode(first.fromVerse === 1 && first.toVerse === single.versesCount ? "whole" : "range");
      setTemplateRanges(null);
    } else {
      setChapter(null);
      setTemplateRanges(t.ranges);
    }
  }

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function submit(replace = false) {
    if (!ready || !child || (!chapter && !templateRanges)) return;
    const ranges: MissionRange[] = templateRanges
      ? templateRanges
      : chapter
        ? [{ chapterId: chapter.id, fromVerse: mode === "whole" ? 1 : fromN, toVerse: mode === "whole" ? chapter.versesCount : toN }]
        : [];
    if (ranges.length === 0) return;
    const input: MissionPlanInput = {
      childId: child.id,
      ranges,
      versesPerDay,
      weekdays: [...weekdays].sort((a, b) => a - b),
      // Toujours dans l'ordre où l'enfant les fait.
      steps: STEPS.map((s) => s.kind).filter((k) => steps.includes(k)),
      messageText: message.trim() || null,
      messageAudioId: voice?.id ?? null,
      replace,
    };
    setPinRequired(false);
    create.mutate(input, {
      onSuccess: (plan) => router.replace({ pathname: "/missions/[id]", params: { id: plan.id } }),
      onError: (error) => {
        if (error instanceof ApiError && error.code === "PIN_REQUIRED") setPinRequired(true);
        else if (error instanceof ApiError && error.code === "ACTIVE_PLAN") {
          Alert.alert(`${name} a déjà une mission en cours`, "La nouvelle mission la remplace. Les étoiles déjà gagnées sont gardées.", [
            { text: "Annuler", style: "cancel" },
            { text: "Remplacer", style: "destructive", onPress: () => submit(true) },
          ]);
        }
      },
    });
  }

  return (
    <Screen edges={[]} keyboard>
      {children.data.length > 1 && !params.childId ? (
        <View style={styles.chips}>
          {children.data.map((c) => (
            <Chip key={c.id} label={c.displayName} selected={c.id === childId} onPress={() => setChild(c.id)} />
          ))}
        </View>
      ) : child ? (
        <Card tone="flat" style={styles.row}>
          <ProfileAvatar name={child.displayName} avatar={child.avatar} size={36} />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Pour {child.displayName}</AppText>
            <AppText variant="caption" muted>
              Profil enfant : la mission s’affiche sur son accueil
            </AppText>
          </View>
        </Card>
      ) : null}

      {templates.data && templates.data.length > 0 ? (
        <>
          <SectionHeader title="Missions prêtes" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.templatesScroll} contentContainerStyle={styles.templates}>
            {templates.data.map((t) => {
              const selected = t.id === templateId;
              return (
                <Card
                  key={t.id}
                  tone={selected ? "accent" : "flat"}
                  onPress={() => applyTemplate(t)}
                  accessibilityState={{ selected }}
                  accessibilityLabel={`${t.title}. ${t.description}`}
                  style={[styles.template, { borderColor: selected ? colors.accent : "transparent" }]}>
                  <View style={styles.templateHeader}>
                    <AppText variant="bodyStrong" style={styles.flex} numberOfLines={2}>
                      {t.title}
                    </AppText>
                    {selected ? <Ionicons name="checkmark-circle" size={18} color={colors.accent} /> : null}
                  </View>
                  <AppText variant="caption" muted numberOfLines={3}>
                    {t.description}
                  </AppText>
                  <AppText variant="caption" color={colors.primary}>
                    {missionSummary(countVerses(t.ranges), t.versesPerDay, t.weekdays)}
                  </AppText>
                </Card>
              );
            })}
          </ScrollView>
        </>
      ) : null}

      <SectionHeader title={child ? `Ce que ${child.displayName} va apprendre` : "Ce qu’il va apprendre"} />
      {templateRanges ? (
        <Card style={styles.gap}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppText variant="headline">{templateSummary(templateRanges, chapters.data)}</AppText>
              <AppText variant="caption" muted>
                {templateRanges.length} passages, dans l’ordre du modèle
              </AppText>
            </View>
          </View>
          {tooLong ? (
            <AppText variant="caption" color={colors.danger}>
              {MAX_MISSION_VERSES} versets au plus par mission.
            </AppText>
          ) : null}
          <Button
            title="Choisir moi-même"
            variant="ghost"
            size="md"
            onPress={() => {
              setTemplateRanges(null);
              setTemplateId(null);
            }}
          />
        </Card>
      ) : chapter && !picking ? (
        <Card style={styles.gap}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppText variant="headline">
                {chapter.id}. {chapter.nameSimple}
              </AppText>
              <AppText variant="caption" muted>
                {chapter.versesCount} versets
              </AppText>
            </View>
            <ArabicText size="md">{chapter.nameArabic}</ArabicText>
          </View>
          <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
            {(["whole", "range"] as const).map((m) => (
              <Pressable
                key={m}
                accessibilityRole="button"
                accessibilityState={{ selected: mode === m }}
                onPress={() => setMode(m)}
                style={[styles.segment, mode === m && { backgroundColor: colors.surface }]}>
                <AppText variant="bodyStrong" color={mode === m ? colors.primary : colors.textMuted}>
                  {m === "whole" ? "Sourate entière" : "Quelques versets"}
                </AppText>
              </Pressable>
            ))}
          </View>
          {mode === "range" ? (
            <View style={styles.row}>
              <View style={styles.flex}>
                <TextField label="Du verset" value={from} onChangeText={setFrom} keyboardType="number-pad" />
              </View>
              <View style={styles.flex}>
                <TextField label="Au verset" value={to} onChangeText={setTo} keyboardType="number-pad" />
              </View>
            </View>
          ) : null}
          {mode === "range" && !rangeValid ? (
            <AppText variant="caption" color={colors.danger}>
              Choisissez des versets entre 1 et {chapter.versesCount}.
            </AppText>
          ) : null}
          {tooLong ? (
            <AppText variant="caption" color={colors.danger}>
              {MAX_MISSION_VERSES} versets au plus par mission : choisissez une partie de la sourate.
            </AppText>
          ) : null}
          <Button title="Changer de sourate" variant="ghost" size="md" onPress={() => setPicking(true)} />
        </Card>
      ) : (
        <View style={styles.gap}>
          <View style={styles.chips}>
            {SHORT_SURAHS.map((id) => {
              const c = chapters.data.find((x) => x.id === id);
              return c ? <Chip key={id} label={c.nameSimple} onPress={() => choose(c)} /> : null;
            })}
          </View>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une autre sourate"
            accessibilityLabel="Rechercher une sourate"
            placeholderTextColor={colors.textMuted}
            style={[styles.search, { color: colors.text, backgroundColor: colors.surfaceMuted }]}
          />
          {query.trim()
            ? filtered.slice(0, 20).map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  onPress={() => choose(c)}
                  style={({ pressed }) => [styles.chapterRow, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
                  <AppText variant="bodyStrong" style={styles.flex}>
                    {c.id}. {c.nameSimple}
                    <AppText variant="caption" muted>
                      {"  "}
                      {c.versesCount} versets
                    </AppText>
                  </AppText>
                  <ArabicText size="sm">{c.nameArabic}</ArabicText>
                </Pressable>
              ))
            : null}
        </View>
      )}

      <SectionHeader title="Les étapes de chaque mission" />
      <Card padded={false}>
        {STEPS.map((step, i) => (
          <View key={step.kind} style={[styles.stepRow, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
            <Ionicons name={step.icon} size={22} color={colors.primary} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{step.title}</AppText>
              <AppText variant="caption" muted>
                {step.hint}
              </AppText>
            </View>
            <Switch
              value={steps.includes(step.kind)}
              onValueChange={() => setSteps((s) => toggle(s, step.kind))}
              trackColor={{ true: colors.primary }}
              accessibilityLabel={step.title}
            />
          </View>
        ))}
      </Card>
      {steps.length === 0 ? (
        <AppText variant="caption" color={colors.danger}>
          Gardez au moins une étape.
        </AppText>
      ) : null}

      <SectionHeader title="Le rythme" />
      <View style={[styles.segmented, { backgroundColor: colors.surfaceMuted }]}>
        {[1, 2, 3].map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityState={{ selected: versesPerDay === n }}
            onPress={() => setVersesPerDay(n)}
            style={[styles.segment, versesPerDay === n && { backgroundColor: colors.surface }]}>
            <AppText variant="bodyStrong" color={versesPerDay === n ? colors.primary : colors.textMuted}>
              {n} verset{n > 1 ? "s" : ""} par jour
            </AppText>
          </Pressable>
        ))}
      </View>
      <View style={styles.gapSm}>
        <AppText variant="caption" muted>
          Les jours de mission
        </AppText>
        <View style={styles.days}>
          {WEEKDAYS.map((d) => {
            const on = weekdays.includes(d.day);
            return (
              <Pressable
                key={d.day}
                accessibilityRole="button"
                accessibilityLabel={d.name}
                accessibilityState={{ selected: on }}
                onPress={() => setWeekdays((w) => toggle(w, d.day))}
                style={[styles.day, { backgroundColor: on ? colors.primary : colors.surface, borderColor: on ? colors.primary : colors.border }]}>
                <AppText variant="bodyStrong" color={on ? colors.onPrimary : colors.text}>
                  {d.short}
                </AppText>
              </Pressable>
            );
          })}
        </View>
        {weekdays.length === 0 ? (
          <AppText variant="caption" color={colors.danger}>
            Choisissez au moins un jour.
          </AppText>
        ) : null}
      </View>

      <SectionHeader title={`Un mot pour ${name}`} />
      <Card style={styles.gap}>
        <VoiceNoteField value={voice} onChange={setVoice} />
        <TextField label="Ou écrivez-lui quelques mots" value={message} onChangeText={(v) => setMessage(v.slice(0, 500))} multiline />
        <AppText variant="caption" faint>
          Le message vocal passe en premier : pas besoin de savoir lire. Vous pourrez ajouter vos explications verset par verset dans le suivi de la mission.
        </AppText>
      </Card>

      <Card tone="primary" style={styles.gap}>
        <AppText variant="label" color={colors.accentSoft}>
          Récapitulatif
        </AppText>
        <AppText variant="headline" color={colors.onPrimary}>
          {ready ? missionSummary(total, versesPerDay, weekdays) : "Mission incomplète"}
        </AppText>
        <AppText variant="caption" color={colors.onPrimary}>
          {ready ? `${name} trouve la première mission dès aujourd’hui sur son accueil. Un jour manqué est simplement reporté.` : "Choisissez une sourate, au moins une étape et un jour."}
        </AppText>
        {pinRequired ? (
          <View style={[styles.pin, { backgroundColor: colors.surface }]}>
            <AppText variant="bodyStrong">Définissez d’abord un code parent</AppText>
            <AppText variant="caption" muted>
              Sans code, un enfant peut ouvrir un profil adulte et changer ses propres missions.
            </AppText>
            {me.data?.isOwner !== false ? (
              <Button title="Définir le code parent" size="md" variant="secondary" onPress={() => router.push("/profiles/manage")} />
            ) : (
              <AppText variant="caption" muted>
                Demandez au titulaire du compte de le définir dans Profils de la famille.
              </AppText>
            )}
          </View>
        ) : create.isError && !(create.error instanceof ApiError && create.error.code === "ACTIVE_PLAN") ? (
          <AppText variant="caption" color={colors.onPrimary}>
            {errorMessage(create.error)}
          </AppText>
        ) : null}
        <Button title="Envoyer la mission" icon="paper-plane-outline" variant="light" loading={create.isPending} disabled={!ready} onPress={() => submit()} />
      </Card>
    </Screen>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border }]}>
      <AppText variant="bodyStrong" color={selected ? colors.onPrimary : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: spacing.md },
  gapSm: { gap: spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  // La rangée déborde des marges de l'écran pour que les cartes défilent bord à bord.
  templatesScroll: { marginHorizontal: -spacing.lg },
  templates: { paddingHorizontal: spacing.lg, gap: spacing.sm },
  template: { width: 240, gap: spacing.sm, borderWidth: 1.5 },
  templateHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  chip: { minHeight: 40, paddingHorizontal: spacing.lg, borderRadius: radius.pill, borderWidth: 1, justifyContent: "center" },
  search: { borderRadius: radius.pill, paddingHorizontal: spacing.lg, minHeight: 48, fontFamily: fonts.regular, fontSize: 15 },
  chapterRow: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.md },
  segmented: { flexDirection: "row", borderRadius: radius.pill, padding: 4 },
  segment: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 44, borderRadius: radius.pill, paddingHorizontal: spacing.xs },
  stepRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  days: { flexDirection: "row", justifyContent: "space-between" },
  day: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  pin: { borderRadius: radius.md, padding: spacing.md, gap: spacing.sm },
});
