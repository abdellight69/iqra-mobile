import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { SafeArea } from "@/components/SafeArea";
import { ErrorState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { KIDS, useKidsMode } from "@/lib/kids";
import { errorMessage } from "@/lib/api";
import { rememberProfile } from "@/lib/profile-memory";
import { useProfiles, useSwitchProfile } from "@/lib/profiles";
import { elevation, spacing, useColors } from "@/lib/theme";
import type { Profile } from "@/lib/types";

/** « Qui lit ? » : choix du profil, code parent pour le profil du titulaire s'il en a un. */
export default function ProfilePicker() {
  const colors = useColors();
  // Profil enfant : pastilles plus grandes cerclées de blanc, un conseil pour le profil à code.
  const kids = useKidsMode();
  const profiles = useProfiles();
  const switchProfile = useSwitchProfile();
  const [askPinFor, setAskPinFor] = useState<Profile | null>(null);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  /**
   * Le code parent est demandé (comme le serveur l'exige) pour ouvrir le profil du titulaire depuis un
   * autre profil, et, depuis un profil enfant, pour ouvrir tout profil qui n'est pas un profil enfant.
   */
  function locked(profile: Profile): boolean {
    const data = profiles.data;
    if (!data?.pinSet || profile.current) return false;
    return profile.isOwner ? !data.isOwner : kids && !profile.isChild;
  }

  function choose(profile: Profile, code?: string) {
    setError(null);
    if (profile.current) {
      void rememberProfile(profile.id);
      return close();
    }
    const data = profiles.data!;
    if (profile.isOwner && data.pinSet && !data.isOwner && !code) {
      setAskPinFor(profile);
      setPin("");
      return;
    }
    switchProfile.mutate(
      { id: profile.id, pin: code },
      {
        onSuccess: () => router.replace("/"),
        onError: (e) => {
          setError(errorMessage(e));
          setPin("");
        },
      },
    );
  }

  return (
    <SafeArea style={[styles.screen, { backgroundColor: colors.background }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={close} hitSlop={12} style={styles.close}>
        <Ionicons name="close" size={26} color={colors.textMuted} />
      </Pressable>
      <View style={styles.body}>
      <View style={styles.titleBlock}>
        <AppText variant="display" center>
          Qui lit ?
        </AppText>
        {kids ? (
          <AppText variant="bodyStrong" muted center>
            Touche ton prénom.
          </AppText>
        ) : null}
      </View>

      {profiles.isPending ? (
        <ActivityIndicator color={colors.primary} />
      ) : profiles.isError ? (
        <ErrorState error={profiles.error} onRetry={() => void profiles.refetch()} />
      ) : askPinFor ? (
        <Card style={styles.pin}>
          <View style={styles.center}>
            <ProfileAvatar name={askPinFor.displayName} avatar={askPinFor.avatar} size={56} />
          </View>
          <AppText variant="headline" center>
            Code parent
          </AppText>
          <AppText muted center>
            Saisissez le code à 4 chiffres pour ouvrir le profil de {askPinFor.displayName}.
          </AppText>
          <TextField
            label="Code"
            value={pin}
            onChangeText={(value) => {
              const digits = value.replace(/\D/g, "").slice(0, 4);
              setPin(digits);
              if (digits.length === 4) choose(askPinFor, digits);
            }}
            keyboardType="number-pad"
            maxLength={4}
            secure
            autoFocus
          />
          {error ? (
            <AppText variant="caption" color={colors.danger} center>
              {error}
            </AppText>
          ) : null}
          {switchProfile.isPending ? <ActivityIndicator color={colors.primary} /> : null}
          <Button title="Annuler" variant="ghost" onPress={() => setAskPinFor(null)} />
        </Card>
      ) : (
        <>
          <View style={styles.grid}>
            {profiles.data.profiles.map((p) => (
              <Pressable
                key={p.id}
                accessibilityRole="button"
                accessibilityLabel={`${p.displayName}${p.current ? ", profil actuel" : ""}`}
                disabled={switchProfile.isPending}
                onPress={() => choose(p)}
                style={({ pressed }) => [styles.tile, { opacity: pressed ? 0.7 : 1 }]}>
                {kids ? (
                  <View style={[styles.ring, { backgroundColor: p.current ? KIDS.sun : colors.surface }, elevation(colors, 2)]}>
                    <ProfileAvatar name={p.displayName} avatar={p.avatar} size={96} />
                    {locked(p) ? (
                      <View style={[styles.lock, { backgroundColor: colors.surface }, elevation(colors)]}>
                        <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <ProfileAvatar name={p.displayName} avatar={p.avatar} size={84} selected={p.current} />
                )}
                <AppText variant={kids ? "headline" : "bodyStrong"} center numberOfLines={1}>
                  {p.displayName}
                </AppText>
                {!kids && locked(p) ? <Ionicons name="lock-closed" size={14} color={colors.textMuted} /> : null}
              </Pressable>
            ))}
          </View>
          {error ? (
            <AppText variant="caption" color={colors.danger} center>
              {error}
            </AppText>
          ) : null}
          {switchProfile.isPending ? <ActivityIndicator color={colors.primary} /> : null}
          {profiles.data.isOwner ? (
            <Button title="Gérer les profils" variant="secondary" icon="people-outline" onPress={() => router.push("/profiles/manage")} />
          ) : null}
          {kids && profiles.data.pinSet ? (
            <AppText variant="caption" muted center>
              Les profils avec un cadenas ont un code : demande à un parent avant de les ouvrir.
            </AppText>
          ) : null}
        </>
      )}
      </View>
    </SafeArea>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: spacing.lg },
  close: { alignSelf: "flex-start" },
  body: { flex: 1, gap: spacing.xl, justifyContent: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: spacing.xl },
  titleBlock: { gap: spacing.xs },
  tile: { width: 128, alignItems: "center", gap: spacing.sm },
  ring: { padding: 6, borderRadius: 54 },
  lock: { position: "absolute", right: -2, bottom: -2, width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  pin: { gap: spacing.md, alignItems: "stretch" },
  center: { alignItems: "center" },
});
