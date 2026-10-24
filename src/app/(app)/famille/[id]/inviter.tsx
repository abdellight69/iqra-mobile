import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, Share, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { ListGroup, ListRow } from "@/components/List";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { errorMessage } from "@/lib/api";
import { useAddProfile, useFamily, useFamilyInvitations, useInvite, useRegenerateCode, useRevokeCode, useRevokeInvitation } from "@/lib/families";
import { formatCode } from "@/lib/families-format";
import { joinPageUrl } from "@/lib/legal";
import { useProfiles } from "@/lib/profiles";
import { radius, spacing, useColors } from "@/lib/theme";

const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long" });

/** Inviter (administrateurs) : par e-mail, par code, ou en ajoutant les profils de mon compte. */
export default function Invite() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const family = useFamily(id);
  const admin = family.data?.myRole === "admin";
  const invitations = useFamilyInvitations(id, admin);
  const invite = useInvite(id);
  const revokeInvitation = useRevokeInvitation(id);
  const regenerate = useRegenerateCode(id);
  const revokeCode = useRevokeCode(id);
  const profiles = useProfiles();
  const addProfile = useAddProfile(id);
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);

  if (family.isPending) return <LoadingState />;
  if (family.isError) return <ErrorState error={family.error} onRetry={() => void family.refetch()} />;
  const f = family.data;
  const memberIds = new Set(f.members.map((m) => m.userId));
  const myProfiles = profiles.data?.isOwner ? profiles.data.profiles.filter((p) => !p.isOwner && !memberIds.has(p.id)) : [];
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  return (
    <Screen edges={[]} keyboard>
      {admin ? (
        <>
          <SectionHeader title="Par e-mail" />
          <AppText muted>La personne reçoit un lien valable 7 jours, qui ne sert qu’une fois.</AppText>
          <TextField
            label="Adresse e-mail"
            value={email}
            onChangeText={(t) => {
              setEmail(t);
              setSentTo(null);
              invite.reset();
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            error={invite.isError ? errorMessage(invite.error) : null}
          />
          {sentTo ? <AppText color={colors.success}>Invitation envoyée à {sentTo}.</AppText> : null}
          <Button
            title="Envoyer l’invitation"
            icon="mail-outline"
            disabled={!validEmail}
            loading={invite.isPending}
            onPress={() =>
              invite.mutate(email.trim(), {
                onSuccess: (inv) => {
                  setSentTo(inv.email);
                  setEmail("");
                },
              })
            }
          />

          <SectionHeader title="Par code" />
          <AppText muted>Pratique en personne : le code se saisit dans Eqra, Profil › Mes familles › Rejoindre. Il reste valable 7 jours.</AppText>
          {f.inviteCode ? (
            <Card tone="flat" style={styles.codeCard}>
              <AppText style={[styles.code, { color: colors.text }]} selectable>
                {formatCode(f.inviteCode.code)}
              </AppText>
              <AppText variant="caption" muted center>
                Valable jusqu’au {dateFr(f.inviteCode.expiresAt)}
              </AppText>
              <View style={styles.codeActions}>
                <Button
                  title="Partager"
                  icon="share-outline"
                  size="md"
                  onPress={() => {
                    const link = joinPageUrl(f.inviteCode!.code);
                    void Share.share({
                      message: `Rejoins notre famille « ${f.name} » sur Eqra avec le code ${formatCode(f.inviteCode!.code)}${link ? ` : ${link}` : ""}`,
                    });
                  }}
                />
                <Button title="Nouveau code" variant="secondary" size="md" loading={regenerate.isPending} onPress={() => regenerate.mutate()} />
                <Button title="Désactiver" variant="ghost" size="md" loading={revokeCode.isPending} onPress={() => revokeCode.mutate()} />
              </View>
            </Card>
          ) : (
            <Button title="Créer un code" icon="keypad-outline" variant="secondary" loading={regenerate.isPending} onPress={() => regenerate.mutate()} />
          )}
          {regenerate.isError ? <AppText color={colors.danger}>{errorMessage(regenerate.error)}</AppText> : null}

          {invitations.data && invitations.data.length > 0 ? (
            <ListGroup title="Invitations en attente">
              {invitations.data.map((inv) => (
                <ListRow
                  key={inv.id}
                  icon="mail-unread-outline"
                  title={inv.email}
                  subtitle={`Envoyée le ${dateFr(inv.createdAt)} · expire le ${dateFr(inv.expiresAt)}`}
                  onPress={() =>
                    Alert.alert("Annuler cette invitation ?", `Le lien envoyé à ${inv.email} ne fonctionnera plus.`, [
                      { text: "Garder", style: "cancel" },
                      { text: "Annuler l’invitation", style: "destructive", onPress: () => revokeInvitation.mutate(inv.id) },
                    ])
                  }
                />
              ))}
            </ListGroup>
          ) : null}
        </>
      ) : (
        <AppText muted>Seuls les administrateurs de la famille invitent de nouveaux membres.</AppText>
      )}

      {myProfiles.length > 0 ? (
        <>
          <SectionHeader title="Les profils de mon compte" />
          <AppText muted>Ils rejoignent la famille avec vous ; vous réglez leur partage et répondez à leurs objectifs.</AppText>
          {myProfiles.map((p) => (
            <Button
              key={p.id}
              title={`Ajouter ${p.displayName}`}
              icon="person-add-outline"
              variant="secondary"
              loading={addProfile.isPending && addProfile.variables?.profileId === p.id}
              onPress={() =>
                addProfile.mutate({ profileId: p.id, sharing: "goals" }, { onError: (error) => Alert.alert("Profil non ajouté", errorMessage(error)) })
              }
            />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  codeCard: { gap: spacing.sm, alignItems: "stretch", borderRadius: radius.lg },
  code: { fontSize: 32, fontWeight: "700", letterSpacing: 4, textAlign: "center", fontVariant: ["tabular-nums"] },
  codeActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center" },
});
