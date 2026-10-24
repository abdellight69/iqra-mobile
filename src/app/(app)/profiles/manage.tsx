import { useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Switch, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { errorMessage } from "@/lib/api";
import { AVATAR_LABELS, AVATARS, avatarColor, useCreateProfile, useDeleteProfile, useProfiles, useSetPin, useUpdateProfile, type Avatar } from "@/lib/profiles";
import { radius, spacing, useColors } from "@/lib/theme";
import type { ArabicLevel, Profile } from "@/lib/types";

const LEVELS: { id: ArabicLevel; label: string }[] = [
  { id: "none", label: "Ne lit pas encore" },
  { id: "beginner", label: "Lit lentement" },
  { id: "fluent", label: "Lit couramment" },
];

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Gestion des profils (titulaire du compte) : progression de chacun, ajout, modification, code parent. */
export default function ManageProfiles() {
  const profiles = useProfiles();
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  if (profiles.isPending) return <LoadingState />;
  if (profiles.isError) return <ErrorState error={profiles.error} onRetry={() => void profiles.refetch()} />;
  const data = profiles.data;
  if (!data.isOwner) {
    return (
      <Screen edges={[]}>
        <AppText muted>Seul le titulaire du compte peut gérer les profils.</AppText>
      </Screen>
    );
  }

  return (
    <Screen edges={[]} keyboard onRefresh={() => void profiles.refetch()} refreshing={profiles.isRefetching}>
      <AppText muted>
        Chaque profil a sa propre progression : vocabulaire, mémorisation, lecture et série de jours. Seul votre profil peut gérer le compte.
      </AppText>

      {data.profiles.map((p) =>
        editing === p.id ? (
          <ProfileForm key={p.id} profile={p} pinSet={data.pinSet} onDone={() => setEditing(null)} />
        ) : (
          <ProfileCard key={p.id} profile={p} onEdit={() => setEditing(p.id)} />
        ),
      )}

      {adding ? (
        <ProfileForm pinSet={data.pinSet} onDone={() => setAdding(false)} />
      ) : data.profiles.length < data.maxProfiles ? (
        <Button title="Ajouter un profil" icon="person-add-outline" variant="secondary" onPress={() => setAdding(true)} />
      ) : (
        <AppText variant="caption" muted center>
          {data.maxProfiles} profils au maximum par compte.
        </AppText>
      )}

      <PinSection pinSet={data.pinSet} />
    </Screen>
  );
}

function ProfileCard({ profile, onEdit }: { profile: Profile; onEdit: () => void }) {
  const colors = useColors();
  const remove = useDeleteProfile();
  const p = profile.progress;

  function confirmDelete() {
    const run = () => remove.mutate(profile.id, { onError: (e) => Alert.alert("Suppression impossible", errorMessage(e)) });
    const message = `Toute la progression de ${profile.displayName} sera effacée. Cette action est définitive.`;
    if (Platform.OS === "web") {
      if (globalThis.confirm?.(message)) run();
      return;
    }
    Alert.alert(`Supprimer le profil de ${profile.displayName} ?`, message, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: run },
    ]);
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <ProfileAvatar name={profile.displayName} avatar={profile.avatar} size={44} />
        <View style={styles.flex}>
          <AppText variant="headline">{profile.displayName}</AppText>
          <AppText variant="caption" muted>
            {[profile.isOwner ? "Titulaire du compte" : profile.isChild ? "Profil enfant" : null, profile.current ? "profil actuel" : null].filter(Boolean).join(" · ") || "Profil de la famille"}
          </AppText>
        </View>
      </View>
      {p ? (
        <View style={styles.stats}>
          <Stat value={p.currentStreak} label={p.currentStreak > 1 ? "jours de suite" : "jour de suite"} />
          <Stat value={`${p.todayXp}/${p.goalXp}`} label="XP aujourd’hui" />
          <Stat value={p.xp} label="XP au total" />
        </View>
      ) : null}
      {p ? (
        <AppText variant="caption" muted>
          {[plural(p.readingLessons, "leçon de lecture", "leçons de lecture"), plural(p.wordsLearned, "mot appris", "mots appris"), plural(p.versesMemorized, "verset mémorisé", "versets mémorisés")].join(" · ")}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button title="Modifier" size="md" variant="secondary" icon="create-outline" onPress={onEdit} style={styles.flex} />
        {!profile.isOwner ? (
          <Button title="Supprimer" size="md" variant="ghost" icon="trash-outline" loading={remove.isPending} onPress={confirmDelete} style={styles.flex} />
        ) : null}
      </View>
      <View style={[styles.accent, { backgroundColor: avatarColor(profile.avatar) }]} />
      {remove.isError ? (
        <AppText variant="caption" color={colors.danger}>
          {errorMessage(remove.error)}
        </AppText>
      ) : null}
    </Card>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <View style={styles.stat}>
      <AppText variant="headline">{value}</AppText>
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

/**
 * Création (sans `profile`) ou modification d'un profil. Un profil enfant exige un code parent :
 * sans code, l'enfant passerait librement sur un profil adulte (le serveur le refuse aussi, 409 PIN_REQUIRED).
 */
function ProfileForm({ profile, pinSet, onDone }: { profile?: Profile; pinSet: boolean; onDone: () => void }) {
  const colors = useColors();
  const create = useCreateProfile();
  const update = useUpdateProfile();
  const [name, setName] = useState(profile?.displayName ?? "");
  const [avatar, setAvatar] = useState<Avatar>((profile?.avatar as Avatar | null) ?? "blue");
  const [level, setLevel] = useState<ArabicLevel | null>(profile ? (profile.arabicLevel ?? null) : "none");
  const [isChild, setIsChild] = useState(profile ? profile.isChild === true : true);
  const mutation = profile ? update : create;
  const childWithoutPin = isChild && !pinSet && !profile?.isOwner;

  function save() {
    const displayName = name.trim();
    if (profile) update.mutate({ id: profile.id, displayName, avatar, ...(profile.isOwner ? {} : { isChild }) }, { onSuccess: onDone });
    else create.mutate({ displayName, avatar, arabicLevel: level, isChild }, { onSuccess: onDone });
  }

  return (
    <Card style={styles.card}>
      <AppText variant="headline">{profile ? `Modifier le profil` : "Nouveau profil"}</AppText>
      <TextField label="Prénom" value={name} onChangeText={setName} autoCapitalize="words" maxLength={50} />
      <AppText variant="caption" muted>
        Couleur
      </AppText>
      <View style={styles.colors}>
        {AVATARS.map((a) => (
          <Pressable
            key={a}
            accessibilityRole="radio"
            accessibilityLabel={`Couleur ${AVATAR_LABELS[a]}`}
            accessibilityState={{ checked: avatar === a }}
            onPress={() => setAvatar(a)}>
            <ProfileAvatar name={name || "?"} avatar={a} size={36} selected={avatar === a} />
          </Pressable>
        ))}
      </View>
      {!profile ? (
        <>
          <AppText variant="caption" muted>
            Lecture de l’arabe
          </AppText>
          <View style={styles.levels}>
            {LEVELS.map((l) => (
              <Pressable
                key={l.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: level === l.id }}
                onPress={() => setLevel(l.id)}
                style={[styles.level, { borderColor: level === l.id ? colors.primary : colors.border, backgroundColor: level === l.id ? colors.primarySoft : colors.surface }]}>
                <AppText variant="caption" color={level === l.id ? colors.primary : colors.text}>
                  {l.label}
                </AppText>
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
      {profile?.isOwner ? null : (
        <View style={styles.switchRow}>
          <View style={styles.flex}>
            <AppText>Profil enfant</AppText>
            <AppText variant="caption" muted>
              Sans réglages ni compte, gros boutons, séances courtes.
            </AppText>
          </View>
          <Switch value={isChild} onValueChange={setIsChild} trackColor={{ true: colors.primary }} accessibilityLabel="Profil enfant" />
        </View>
      )}
      {childWithoutPin ? (
        <AppText variant="caption" color={colors.danger}>
          Définissez d’abord un code parent (ci-dessous) : sans lui, un enfant pourrait ouvrir votre profil et gérer le compte.
        </AppText>
      ) : null}
      {mutation.isError ? (
        <AppText variant="caption" color={colors.danger}>
          {errorMessage(mutation.error)}
        </AppText>
      ) : null}
      <View style={styles.actions}>
        <Button title="Annuler" size="md" variant="ghost" onPress={onDone} style={styles.flex} />
        <Button title={profile ? "Enregistrer" : "Créer"} size="md" disabled={name.trim().length < 2 || childWithoutPin} loading={mutation.isPending} onPress={save} style={styles.flex} />
      </View>
    </Card>
  );
}

/** Code parent : protège le profil du titulaire (et donc la gestion du compte) contre les enfants. */
function PinSection({ pinSet }: { pinSet: boolean }) {
  const colors = useColors();
  const setPin = useSetPin();
  const [password, setPassword] = useState("");
  const [pin, setPinValue] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  function submit(value: string | null) {
    setStatus(null);
    setPin.mutate(
      { password, pin: value },
      {
        onSuccess: () => {
          setPassword("");
          setPinValue("");
          setStatus(value ? "Code parent enregistré." : "Code parent retiré.");
        },
        onError: (e) => setStatus(errorMessage(e)),
      },
    );
  }

  return (
    <>
      <SectionHeader title="Code parent" />
      <Card style={styles.card}>
        <AppText muted>
          {pinSet
            ? "Un code à 4 chiffres est demandé pour ouvrir votre profil depuis celui d’un enfant."
            : "Sans code, chacun peut ouvrir votre profil, et donc gérer le compte. Nous vous conseillons d’en définir un."}
        </AppText>
        <TextField label="Mot de passe du compte" value={password} onChangeText={setPassword} secure autoComplete="current-password" />
        <TextField
          label={pinSet ? "Nouveau code (4 chiffres)" : "Code (4 chiffres)"}
          value={pin}
          onChangeText={(v) => setPinValue(v.replace(/\D/g, "").slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          secure
        />
        {status ? (
          <AppText variant="caption" color={setPin.isError ? colors.danger : colors.textMuted}>
            {status}
          </AppText>
        ) : null}
        <Button
          title={pinSet ? "Changer le code" : "Définir le code"}
          size="md"
          disabled={!password || pin.length !== 4}
          loading={setPin.isPending && pin.length === 4}
          onPress={() => submit(pin)}
        />
        {pinSet ? <Button title="Retirer le code" size="md" variant="ghost" disabled={!password} onPress={() => submit(null)} /> : null}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  flex: { flex: 1 },
  card: { gap: spacing.md, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stats: { flexDirection: "row", gap: spacing.sm },
  stat: { flex: 1, gap: 2 },
  actions: { flexDirection: "row", gap: spacing.sm },
  accent: { position: "absolute", left: 0, top: 0, bottom: 0, width: 4 },
  colors: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  levels: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  level: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 6, minHeight: 44, justifyContent: "center" },
});
