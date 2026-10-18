import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { TextField } from "@/components/TextField";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useMe, useRecitations, useTranslations, useUpdateMe } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

const GOALS = [10, 30, 50, 100];

export default function Settings() {
  const colors = useColors();
  const me = useMe();
  const update = useUpdateMe();
  const translations = useTranslations();
  const recitations = useRecitations();
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

  const frenchTranslations = (translations.data ?? []).filter((t) => t.languageName.toLowerCase() === "french");

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
            <Option label="Par défaut (Muhammad Hamidullah)" selected={user.translationId === null} onPress={() => update.mutate({ translationId: null })} />
            {frenchTranslations.map((t) => (
              <Option key={t.id} label={t.name} detail={t.authorName} selected={user.translationId === t.id} onPress={() => update.mutate({ translationId: t.id })} />
            ))}
          </>
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
  chip: { borderWidth: 1.5, borderRadius: radius.pill, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  option: { flexDirection: "row", alignItems: "center", gap: spacing.md, padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
});
