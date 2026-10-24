import Ionicons from "@expo/vector-icons/Ionicons";
import Constants from "expo-constants";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  useColorScheme,
  View,
} from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { api, errorMessage } from "@/lib/api";
import { type AppearanceMode, useActiveTheme, useAppearance, useSupporterPerks } from "@/lib/appearance-store";
import { useAuth } from "@/lib/auth-store";
import { router } from "expo-router";
import { isFrench, languageLabel } from "@/lib/language";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legal";
import { palette, THEMES, type ThemeDefinition } from "@/lib/palettes";
import { useProfiles } from "@/lib/profiles";
import {
  formatTime,
  REMINDER_TIMES,
  requestReminderPermission,
  useReminders,
} from "@/lib/reminders";
import {
  useMe,
  useRecitations,
  useResourceDefaults,
  useTafsirs,
  useTranslations,
  useUpdateMe,
} from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";
import type { TafsirResource } from "@/lib/types";

const GOALS = [10, 30, 50, 100];
const APPEARANCES: { mode: AppearanceMode; label: string }[] = [
  { mode: "system", label: "Comme le téléphone" },
  { mode: "light", label: "Clair" },
  { mode: "dark", label: "Sombre" },
];

export default function Settings() {
  const colors = useColors();
  const appearance = useAppearance((s) => s.mode);
  const setAppearance = useAppearance((s) => s.setMode);
  const activeTheme = useActiveTheme();
  const setTheme = useAppearance((s) => s.setTheme);
  const supporter = useSupporterPerks();
  const me = useMe();
  const update = useUpdateMe();
  const translations = useTranslations();
  const recitations = useRecitations();
  const defaults = useResourceDefaults();
  const [showAllLanguages, setShowAllLanguages] = useState(false);
  const tafsirs = useTafsirs();
  const [showAllTafsirs, setShowAllTafsirs] = useState(false);
  const reminders = useReminders();
  const user = me.data;
  // Serveur plus ancien (sans profils) : l'utilisateur est le titulaire.
  const isOwner = user?.isOwner !== false;
  const profiles = useProfiles(isOwner);
  const hasChildProfiles = (profiles.data?.profiles ?? []).some(
    (p) => p.isChild,
  );
  const signOut = useAuth((s) => s.signOut);
  const [name, setName] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (!user)
    return (
      <ActivityIndicator
        style={{ marginTop: spacing.xxl }}
        color={colors.primary}
      />
    );
  // Un profil enfant n'a pas accès aux réglages (traduction, rappels, compte) : c'est au parent de les régler.
  if (user.isChild)
    return (
      <Screen>
        <EmptyState
          icon="lock-closed-outline"
          title="Réglages réservés aux parents"
          message="Demande à un parent de changer de profil pour modifier les réglages."
          action={{ title: "Retour", onPress: () => router.back() }}
        />
      </Screen>
    );

  async function changePassword() {
    setPasswordStatus(null);
    try {
      await api("/me/password", {
        method: "POST",
        // Le serveur ferme les autres sessions du compte et garde celle de cet appareil.
        body: {
          currentPassword,
          newPassword,
          refreshToken: useAuth.getState().tokens?.refreshToken,
        },
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordStatus("Mot de passe modifié.");
    } catch (e) {
      setPasswordStatus(errorMessage(e));
    }
  }

  // Suppression du compte : confirmation par le mot de passe dans un formulaire de l'écran (et non
  // `Alert.prompt`, qui n'existe que sur iOS et ne faisait rien sur Android).
  async function deleteAccount() {
    setDeleteError(null);
    setDeleting(true);
    try {
      await api("/me", { method: "DELETE", body: { password: deletePassword } });
      await signOut();
    } catch (e) {
      setDeleteError(errorMessage(e));
    } finally {
      setDeleting(false);
    }
  }

  const all = translations.data ?? [];
  const frenchTranslations = all.filter((t) => isFrench(t.languageName));
  // Autres langues, regroupées et triées par nom de langue.
  const otherLanguages = [
    ...new Set(
      all.filter((t) => !isFrench(t.languageName)).map((t) => t.languageName),
    ),
  ].sort((a, b) => a.localeCompare(b, "fr"));
  const defaultTranslation = all.find(
    (t) => t.id === defaults.data?.translationId,
  );
  const chosen = all.find((t) => t.id === user.translationId);

  return (
    <Screen edges={[]} keyboard>
      <SectionHeader title="Profil" />
      <Card style={styles.group}>
        <View style={styles.profileRow}>
          <ProfileAvatar
            name={user.displayName}
            avatar={user.avatar}
            size={40}
          />
          <View style={styles.flex}>
            <AppText variant="bodyStrong">{user.displayName}</AppText>
            <AppText variant="caption" muted>
              {isOwner ? "Titulaire du compte" : "Profil de la famille"}
            </AppText>
          </View>
        </View>
        <View style={styles.profileActions}>
          <Button
            title="Changer de profil"
            size="md"
            variant="secondary"
            icon="swap-horizontal"
            onPress={() => router.push("/profiles")}
            style={styles.flex}
          />
          {isOwner ? (
            <Button
              title="Gérer"
              size="md"
              variant="secondary"
              icon="people-outline"
              onPress={() => router.push("/profiles/manage")}
              style={styles.flex}
            />
          ) : null}
        </View>
        <TextField
          label="Nom affiché"
          value={name ?? user.displayName}
          onChangeText={setName}
        />
        <Button
          title="Enregistrer"
          size="md"
          variant="secondary"
          disabled={!name || name === user.displayName}
          loading={update.isPending && name !== null}
          onPress={() =>
            update.mutate(
              { displayName: name ?? user.displayName },
              { onSuccess: () => setName(null) },
            )
          }
        />
      </Card>

      <SectionHeader title="Apparence" />
      <View style={styles.chips}>
        {APPEARANCES.map((a) => (
          <Choice
            key={a.mode}
            label={a.label}
            selected={appearance === a.mode}
            onPress={() => setAppearance(a.mode)}
          />
        ))}
      </View>

      <SectionHeader title="Couleurs" />
      <View style={styles.themes}>
        {THEMES.map((theme) => (
          <ThemeChoice
            key={theme.id}
            theme={theme}
            selected={activeTheme === theme.id}
            locked={theme.supporter && !supporter}
            onPress={() =>
              theme.supporter && !supporter
                ? Alert.alert(
                    "Thème Soutien",
                    `« ${theme.label} » fait partie des remerciements de l'abonnement Soutien. Eqra reste entièrement gratuite : l'abonnement sert seulement à soutenir son développement.`,
                  )
                : setTheme(theme.id)
            }
          />
        ))}
      </View>

      <SectionHeader title="Objectif quotidien" />
      <View style={styles.chips}>
        {GOALS.map((goal) => (
          <Choice
            key={goal}
            label={`${goal} XP`}
            selected={user.dailyGoalXp === goal}
            onPress={() => update.mutate({ dailyGoalXp: goal })}
          />
        ))}
      </View>

      <SectionHeader title="Rappels" />
      <Card style={styles.reminder}>
        <View style={styles.reminderRow}>
          <View style={styles.flex}>
            <AppText variant="bodyStrong">Me rappeler de pratiquer</AppText>
            <AppText variant="caption" muted>
              Chaque jour à l’heure choisie, tant que l’objectif du jour n’est
              pas atteint, et quand des versets sont à réviser.
            </AppText>
          </View>
          <Switch
            accessibilityLabel="Rappels"
            disabled={Platform.OS === "web"}
            value={reminders.enabled}
            trackColor={{ true: colors.primary, false: colors.border }}
            onValueChange={async (enabled) => {
              if (enabled && !(await requestReminderPermission())) {
                Alert.alert(
                  "Notifications désactivées",
                  "Autorisez les notifications d’Eqra dans les réglages de votre téléphone.",
                );
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
                selected={
                  reminders.hour === time.hour &&
                  reminders.minute === time.minute
                }
                onPress={() => void reminders.update(time)}
              />
            ))}
          </View>
        ) : null}
        {reminders.enabled && isOwner && hasChildProfiles ? (
          <View style={styles.reminderRow}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">
                Aussi pour les profils enfants
              </AppText>
              <AppText variant="caption" muted>
                Sinon, aucun rappel n’est envoyé quand un profil enfant est
                ouvert sur cet appareil.
              </AppText>
            </View>
            <Switch
              accessibilityLabel="Rappels pour les profils enfants"
              value={reminders.kids}
              trackColor={{ true: colors.primary, false: colors.border }}
              onValueChange={(kids) => void reminders.update({ kids })}
            />
          </View>
        ) : null}
      </Card>

      <SectionHeader title="Traduction du sens" />
      <Card padded={false}>
        {translations.isPending ? (
          <ActivityIndicator
            style={{ margin: spacing.lg }}
            color={colors.primary}
          />
        ) : translations.isError ? (
          <AppText style={{ margin: spacing.lg }} muted>
            {errorMessage(translations.error)}
          </AppText>
        ) : (
          <>
            <Option
              label={`Par défaut${defaultTranslation ? ` · ${defaultTranslation.name}` : ""}`}
              detail={
                defaultTranslation
                  ? languageLabel(defaultTranslation.languageName)
                  : undefined
              }
              selected={user.translationId === null}
              onPress={() => update.mutate({ translationId: null })}
            />
            {frenchTranslations.map((t) => (
              <Option
                key={t.id}
                label={t.name}
                detail={t.authorName}
                selected={user.translationId === t.id}
                onPress={() => update.mutate({ translationId: t.id })}
              />
            ))}
            {otherLanguages.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setShowAllLanguages((v) => !v)}
                style={[styles.option, { borderBottomColor: colors.border }]}
              >
                <View style={styles.flex}>
                  <AppText color={colors.primary}>
                    {showAllLanguages
                      ? "Masquer les autres langues"
                      : "Autres langues"}
                  </AppText>
                  {!showAllLanguages &&
                  chosen &&
                  !isFrench(chosen.languageName) ? (
                    <AppText variant="caption" muted>
                      Actuellement : {chosen.name} (
                      {languageLabel(chosen.languageName)})
                    </AppText>
                  ) : null}
                </View>
                <Ionicons
                  name={showAllLanguages ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={colors.textMuted}
                />
              </Pressable>
            ) : null}
            {showAllLanguages
              ? otherLanguages.map((language) => (
                  <View key={language}>
                    <AppText
                      variant="label"
                      muted
                      style={styles.languageHeader}
                    >
                      {languageLabel(language)}
                    </AppText>
                    {all
                      .filter((t) => t.languageName === language)
                      .map((t) => (
                        <Option
                          key={t.id}
                          label={t.name}
                          detail={t.authorName}
                          selected={user.translationId === t.id}
                          onPress={() => update.mutate({ translationId: t.id })}
                        />
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
          <ActivityIndicator
            style={{ margin: spacing.lg }}
            color={colors.primary}
          />
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
          <ActivityIndicator
            style={{ margin: spacing.lg }}
            color={colors.primary}
          />
        ) : (
          <>
            <Option
              label="Par défaut (Mishari Rashid al-Afasy)"
              selected={user.recitationId === null}
              onPress={() => update.mutate({ recitationId: null })}
            />
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

      {isOwner ? (
        <>
          <SectionHeader title="Mot de passe" />
          <Card style={styles.group}>
            <TextField
              label="Mot de passe actuel"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secure
              autoComplete="current-password"
            />
            <TextField
              label="Nouveau mot de passe"
              value={newPassword}
              onChangeText={setNewPassword}
              secure
              autoComplete="new-password"
            />
            {passwordStatus ? (
              <AppText variant="caption" muted>
                {passwordStatus}
              </AppText>
            ) : null}
            <Button
              title="Modifier"
              size="md"
              variant="secondary"
              disabled={!currentPassword || newPassword.length < 8}
              onPress={changePassword}
            />
          </Card>

          {confirmDelete ? (
            <Card style={styles.group}>
              <AppText variant="headline">Supprimer le compte</AppText>
              <AppText muted>
                Cette action est définitive : tous les profils du compte, leur progression et leurs missions seront effacés.
                Saisissez votre mot de passe pour confirmer.
              </AppText>
              <TextField
                label="Mot de passe"
                value={deletePassword}
                onChangeText={setDeletePassword}
                secure
                autoComplete="current-password"
                error={deleteError}
              />
              <View style={styles.profileActions}>
                <Button
                  title="Annuler"
                  size="md"
                  variant="ghost"
                  style={styles.flex}
                  onPress={() => {
                    setConfirmDelete(false);
                    setDeletePassword("");
                    setDeleteError(null);
                  }}
                />
                <Button
                  title="Supprimer définitivement"
                  size="md"
                  variant="danger"
                  icon="trash-outline"
                  style={styles.flex}
                  disabled={!deletePassword}
                  loading={deleting}
                  onPress={() => void deleteAccount()}
                />
              </View>
            </Card>
          ) : (
            <Button
              title="Supprimer mon compte"
              variant="danger"
              icon="trash-outline"
              onPress={() => setConfirmDelete(true)}
            />
          )}
        </>
      ) : (
        <AppText variant="caption" muted>
          Le mot de passe et la suppression du compte sont gérés depuis le
          profil du titulaire.
        </AppText>
      )}

      <SectionHeader title="À propos" />
      <Card style={styles.group}>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(TERMS_URL)} style={styles.linkRow}>
          <Ionicons name="document-text-outline" size={20} color={colors.primary} />
          <AppText style={styles.flex}>Conditions d’utilisation</AppText>
          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
        </Pressable>
        <Pressable accessibilityRole="link" onPress={() => void Linking.openURL(PRIVACY_URL)} style={styles.linkRow}>
          <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
          <AppText style={styles.flex}>Politique de confidentialité</AppText>
          <Ionicons name="open-outline" size={18} color={colors.textMuted} />
        </Pressable>
        <AppText variant="caption" muted>
          Eqra {Constants.expoConfig?.version ?? ""} · l’application reste entièrement gratuite.
        </AppText>
      </Card>
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
  const languages = [
    ...new Set(
      tafsirs
        .filter((t) => !isFrench(t.languageName))
        .map((t) => t.languageName),
    ),
  ];
  return (
    <>
      <Option
        label={french[0] ? `Par défaut · ${french[0].name}` : "Par défaut"}
        detail={
          french[0]
            ? `Français · ${french[0].authorName}`
            : "Aucun tafsir en français disponible pour le moment"
        }
        selected={selectedId === null}
        onPress={() => onSelect(null)}
      />
      {french.slice(1).map((t) => (
        <Option
          key={t.id}
          label={t.name}
          detail={t.authorName}
          selected={selectedId === t.id}
          onPress={() => onSelect(t.id)}
        />
      ))}
      {languages.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={onToggleAll}
          style={[styles.option, { borderBottomColor: colors.border }]}
        >
          <AppText color={colors.primary} style={styles.flex}>
            {showAll
              ? "Masquer les autres langues"
              : "Tafsirs dans d’autres langues"}
          </AppText>
          <Ionicons
            name={showAll ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textMuted}
          />
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
                  <Option
                    key={t.id}
                    label={t.name}
                    detail={t.authorName}
                    selected={selectedId === t.id}
                    onPress={() => onSelect(t.id)}
                  />
                ))}
            </View>
          ))
        : null}
    </>
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: selected ? colors.primarySoft : colors.surface,
        },
      ]}
    >
      <AppText
        variant="bodyStrong"
        color={selected ? colors.primary : colors.text}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

/** Aperçu d'un thème : sa couleur principale et son or, dans le mode (clair ou sombre) en cours. */
function ThemeChoice({
  theme,
  selected,
  locked,
  onPress,
}: {
  theme: ThemeDefinition;
  selected: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const preview = palette(theme.id, useColorScheme() === "dark");
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={locked ? `${theme.label}, réservé au Soutien` : theme.label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.themeChoice,
        {
          borderColor: selected ? colors.primary : colors.border,
          backgroundColor: preview.surface,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <View style={[styles.swatch, { backgroundColor: preview.hero }]}>
        <View style={[styles.swatchDot, { backgroundColor: preview.accent }]} />
      </View>
      <AppText variant="bodyStrong" color={preview.text}>
        {theme.label}
      </AppText>
      {locked ? (
        <View style={styles.themeLabel}>
          <Ionicons name="lock-closed" size={12} color={preview.textMuted} />
          <AppText variant="caption" color={preview.textMuted}>
            Soutien
          </AppText>
        </View>
      ) : selected ? (
        <Ionicons name="checkmark-circle" size={18} color={preview.primary} />
      ) : null}
    </Pressable>
  );
}

function Option({
  label,
  detail,
  selected,
  onPress,
}: {
  label: string;
  detail?: string;
  selected: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        { borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <View style={styles.flex}>
        <AppText>{label}</AppText>
        {detail ? (
          <AppText variant="caption" muted>
            {detail}
          </AppText>
        ) : null}
      </View>
      {selected ? (
        <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  profileActions: { flexDirection: "row", gap: spacing.sm },
  flex: { flex: 1 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, minHeight: 44 },
  group: { gap: spacing.md },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  themes: { flexDirection: "row", gap: spacing.sm },
  themeChoice: {
    flex: 1,
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    minHeight: 124,
  },
  swatch: { width: 44, height: 44, borderRadius: 22, alignItems: "flex-end", justifyContent: "flex-end" },
  swatchDot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: "#FFFFFF" },
  themeLabel: { flexDirection: "row", alignItems: "center", gap: 4 },
  reminder: { gap: spacing.md },
  reminderRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  chip: {
    borderWidth: 1.5,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 44,
    justifyContent: "center",
  },
  languageHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xs,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
