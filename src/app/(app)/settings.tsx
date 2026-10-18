import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { TextField } from "@/components/TextField";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { isFrench, languageLabel } from "@/lib/language";
import { formatTime, REMINDER_TIMES, requestReminderPermission, useReminders } from "@/lib/reminders";
import { useMe, useRecitations, useResourceDefaults, useTafsirs, useTranslations, useUpdateMe } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { TafsirResource } from "@/lib/types";

const GOALS = [10, 30, 50, 100];

export default function Settings() {
  const colors = useColors();
  const me = useMe();
  const update = useUpdateMe();
  const translations = useTranslations();
  const recitations = useRecitations();
  const defaults = useResourceDefaults();
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const tafsirs = useTafsirs();
  const [showAllTafsirs, setShowAllTafsirs] = useState(false);
  const reminders = useReminders();
  const signOut = useAuth((s) => s.signOut);
  const [name, setName] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);

  const user = me.data;
  if (!user) return <ActivityIndicator style={{ marginTop: spacing.xxl }} color={colors.primary} />;

  async function changePassword() {
    setPasswordStatus(null);
    try {
      await api("/me/password", { method: "POST", body: { currentPassword, newPassword } });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordStatus("Mot de passe modifié.");
    } catch (e) {
      setPasswordStatus(errorMessage(e));
    }
  }

  function deleteAccount() {
    Alert.prompt?.(
      "Supprimer le compte",
      "Cette action est définitive : toute votre progression sera effacée. Saisissez votre mot de passe pour confirmer.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async (password?: string) => {
            try {
              await api("/me", { method: "DELETE", body: { password } });
              await signOut();
            } catch (e) {
              Alert.alert("Suppression impossible", errorMessage(e));
            }
          },
        },
      ],
      "secure-text",
    );
  }

  const all = translations.data ?? [];
  const frenchTranslations = all.filter((t) => isFrench(t.languageName));
  // Autres langues, regroupées et triées par nom de langue.
  const otherLanguages = [...new Set(all.filter((t) => !isFrench(t.languageName)).map((t) => t.languageName))].sort((a, b) =>
    a.localeCompare(b, "fr"),
  );
  const defaultTranslation = all.find((t) => t.id === defaults.data?.translationId);
  const chosen = all.find((t) => t.id === user.translationId);

  return (
    <Screen edges={[]} keyboard>
      <SectionHeader title="Profil" />
      <Card style={styles.group}>
        <TextField label="Nom affiché" value={name ?? user.displayName} onChangeText={setName} />
        <Button
          title="Enregistrer"
          size="md"
          variant="secondary"
          disabled={!name || name === user.displayName}
          loading={update.isPending && name !== null}
          onPress={() => update.mutate({ displayName: name ?? user.displayName }, { onSuccess: () => setName(null) })}
        />
      </Card>

      <SectionHeader title="Objectif quotidien" />
      <View style={styles.chips}>
        {GOALS.map((goal) => (
          <Choice key={goal} label={`${goal} XP`} selected={user.dailyGoalXp === goal} onPress={() => update.mutate({ dailyGoalXp: goal })} />
        ))}
      </View>

      <SectionHeader title="Rappel quotidien" />
      <Card style={styles.reminder}>
        <View style={styles.reminderRow}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Me rappeler de pratiquer</AppText>
            <AppText variant="caption" muted>
              Seulement les jours où vous n’avez pas encore pratiqué.
            </AppText>
          </View>
          <Switch
            accessibilityLabel="Rappel quotidien"
            disabled={Platform.OS === "web"}
            value={reminders.enabled}
            trackColor={{ true: colors.primary, false: colors.border }}
            onValueChange={async (enabled) => {
              if (enabled && !(await requestReminderPermission())) {
                Alert.alert("Notifications désactivées", "Autorisez les notifications d’Iqra dans les réglages de votre téléphone.");
                return;
              }
              await reminders.update({ enabled });
            }}
          />
        </View>
        {reminders.enabled ? (
          <View style={styles.chips}>
            {REMINDER_TIMES.map((time) => (
              <Choice
                key={formatTime(time.hour, time.minute)}
                label={formatTime(time.hour, time.minute)}
                selected={reminders.hour === time.hour && reminders.minute === time.minute}
                onPress={() => void reminders.update(time)}
              />
            ))}
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Traduction du sens" />
      <Card padded={false}>
        {translations.isPending ? (
          <ActivityIndicator style={{ margin: spacing.lg }} color={colors.primary} />
        ) : translations.isError ? (
          <AppText style={{ margin: spacing.lg }} muted>
            {errorMessage(translations.error)}
          </AppText>
        ) : (
          <>
            <Option
              label={`Par défaut${defaultTranslation ? ` · ${defaultTranslation.name}` : ""}`}
              detail={defaultTranslation ? languageLabel(defaultTranslation.languageName) : undefined}
              selected={user.translationId === null}
              onPress={() => update.mutate({ translationId: null })}
            />
            {frenchTranslations.map((t) => (
              <Option key={t.id} label={t.name} detail={t.authorName} selected={user.translationId === t.id} onPress={() => update.mutate({ translationId: t.id })} />
            ))}
            {otherLanguages.length > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => setShowAllLanguages((v) => !v)} style={[styles.option, { borderBottomColor: colors.border }]}>
                <View style={styles.flex}>
                  <AppText color={colors.primary}>{showAllLanguages ? "Masquer les autres langues" : "Autres langues"}</AppText>
                  {!showAllLanguages && chosen && !isFrench(chosen.languageName) ? (
                    <AppText variant="caption" muted>
                      Actuellement : {chosen.name} ({languageLabel(chosen.languageName)})
                    </AppText>
                  ) : null}
                </View>
                <Ionicons name={showAllLanguages ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
              </Pressable>
            ) : null}
            {showAllLanguages
              ? otherLanguages.map((language) => (
                  <View key={language}>
                    <AppText variant="label" muted style={styles.languageHeader}>
                      {languageLabel(language)}
                    </AppText>
                    {all
                      .filter((t) => t.languageName === language)
                      .map((t) => (
                        <Option key={t.id} label={t.name} detail={t.authorName} selected={user.translationId === t.id} onPress={() => update.mutate({ translationId: t.id })} />
                      ))}
                  </View>
                ))
              : null}
          </>
        )}
      </Card>

      <SectionHeader title="Tafsir" />
      <Card padded={false}>
        {tafsirs.isPending ? (
          <ActivityIndicator style={{ margin: spacing.lg }} color={colors.primary} />
        ) : tafsirs.isError ? (
          <AppText style={{ margin: spacing.lg }} muted>
            {errorMessage(tafsirs.error)}
          </AppText>
        ) : (
          <TafsirOptions
            tafsirs={tafsirs.data}
            selectedId={user.tafsirId ?? null}
            showAll={showAllTafsirs}
            onToggleAll={() => setShowAllTafsirs((v) => !v)}
            onSelect={(tafsirId) => update.mutate({ tafsirId })}
          />
        )}
      </Card>

      <SectionHeader title="Récitateur" />
      <Card padded={false}>
        {recitations.isPending ? (
          <ActivityIndicator style={{ margin: spacing.lg }} color={colors.primary} />
        ) : (
          <>
            <Option label="Par défaut (Mishari Rashid al-Afasy)" selected={user.recitationId === null} onPress={() => update.mutate({ recitationId: null })} />
            {(recitations.data ?? []).map((r) => (
              <Option
                key={r.id}
                label={r.translatedName ?? r.reciterName}
                detail={r.style ?? undefined}
                selected={user.recitationId === r.id}
                onPress={() => update.mutate({ recitationId: r.id })}
              />
            ))}
          </>
        )}
      </Card>

      <SectionHeader title="Mot de passe" />
      <Card style={styles.group}>
        <TextField label="Mot de passe actuel" value={currentPassword} onChangeText={setCurrentPassword} secure autoComplete="current-password" />
        <TextField label="Nouveau mot de passe" value={newPassword} onChangeText={setNewPassword} secure autoComplete="new-password" />
        {passwordStatus ? <AppText variant="caption" muted>{passwordStatus}</AppText> : null}
        <Button title="Modifier" size="md" variant="secondary" disabled={!currentPassword || newPassword.length < 8} onPress={changePassword} />
      </Card>

      <Button title="Supprimer mon compte" variant="danger" icon="trash-outline" onPress={deleteAccount} />
    </Screen>
  );
}

/** Tafsirs en français d'abord ; les autres langues sur demande, présentées comme telles. */
function TafsirOptions({
  tafsirs,
  selectedId,
  showAll,
  onToggleAll,
  onSelect,
}: {
  tafsirs: TafsirResource[];
  selectedId: number | null;
  showAll: boolean;
  onToggleAll: () => void;
  onSelect: (tafsirId: number | null) => void;
}) {
  const colors = useColors();
  const french = tafsirs.filter((t) => isFrench(t.languageName));
  const languages = [...new Set(tafsirs.filter((t) => !isFrench(t.languageName)).map((t) => t.languageName))];
  return (
    <>
      <Option
        label={french[0] ? `Par défaut · ${french[0].name}` : "Par défaut"}
        detail={french[0] ? `Français · ${french[0].authorName}` : "Aucun tafsir en français disponible pour le moment"}
        selected={selectedId === null}
        onPress={() => onSelect(null)}
      />
      {french.slice(1).map((t) => (
        <Option key={t.id} label={t.name} detail={t.authorName} selected={selectedId === t.id} onPress={() => onSelect(t.id)} />
      ))}
      {languages.length > 0 ? (
        <Pressable accessibilityRole="button" onPress={onToggleAll} style={[styles.option, { borderBottomColor: colors.border }]}>
          <AppText color={colors.primary} style={styles.flex}>
            {showAll ? "Masquer les autres langues" : "Tafsirs dans d’autres langues"}
          </AppText>
          <Ionicons name={showAll ? "chevron-up" : "chevron-down"} size={16} color={colors.textMuted} />
        </Pressable>
      ) : null}
      {showAll
        ? languages.map((language) => (
            <View key={language}>
              <AppText variant="label" muted style={styles.languageHeader}>
                {languageLabel(language)}
              </AppText>
              {tafsirs
                .filter((t) => t.languageName === language)
                .map((t) => (
                  <Option key={t.id} label={t.name} detail={t.authorName} selected={selectedId === t.id} onPress={() => onSelect(t.id)} />
                ))}
            </View>
          ))
        : null}
    </>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
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
    </Pressable>
  );
}

function Option({ label, detail, selected, onPress }: { label: string; detail?: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.option, { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
      <View style={styles.flex}>
        <AppText>{label}</AppText>
        {detail ? (
          <AppText variant="caption" muted>
            {detail}
          </AppText>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  group: { gap: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  reminder: { gap: spacing.md },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  chip: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  languageHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.xs },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
});
