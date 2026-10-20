import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Chip } from "@/components/FamilyGoalCard";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { TextField } from "@/components/TextField";
import { errorMessage } from "@/lib/api";
import { type JoinCredential, useAcceptInvitation, useJoinFamily, useJoinPreview, useReceivedInvitations } from "@/lib/families";
import { parseJoinInput, SHARING, SHARING_ORDER } from "@/lib/families-format";
import { useMe } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";
import type { FamilySharing } from "@/lib/types";

/**
 * Rejoindre une famille : par le lien de l’e-mail (eqra://famille/rejoindre?t=…), un code, ou un
 * lien collé. On voit la famille et on choisit ce qu’on partage avant de rejoindre.
 */
export default function JoinFamily() {
  const colors = useColors();
  const params = useLocalSearchParams<{ t?: string; c?: string; i?: string }>();
  const me = useMe();
  const fromLink = useMemo<JoinCredential | null>(() => (params.t ? { token: params.t } : params.c ? parseJoinInput(params.c) : null), [params.t, params.c]);
  const [input, setInput] = useState(params.c ?? "");
  const [credential, setCredential] = useState<JoinCredential | null>(fromLink);
  const [sharing, setSharing] = useState<FamilySharing>("goals");
  const preview = useJoinPreview();
  const join = useJoinFamily();
  const accept = useAcceptInvitation();
  const received = useReceivedInvitations(!!params.i);
  const invitation = params.i ? received.data?.find((inv) => inv.id === params.i) : undefined;
  const started = useRef(false);

  // Arrivée par un lien : l’aperçu se charge tout de suite.
  useEffect(() => {
    if (started.current || !fromLink) return;
    started.current = true;
    preview.mutate(fromLink);
  }, [fromLink, preview]);

  if (me.data?.isChild) {
    return (
      <Screen edges={[]}>
        <AppText muted>Demande au titulaire du compte de t’ajouter à cette famille.</AppText>
      </Screen>
    );
  }

  const parsed = parseJoinInput(input);
  // Invitation reçue dans l'app : mêmes informations que l'aperçu d'un lien, sans jeton.
  const p = invitation
    ? { familyId: invitation.familyId, familyName: invitation.familyName, inviterName: invitation.inviterName, membersCount: null, alreadyMember: false }
    : preview.data;
  const joining = invitation ? accept : join;
  const onJoined = ({ familyId }: { familyId: string }) => router.replace({ pathname: "/famille/[id]", params: { id: familyId } });

  return (
    <Screen edges={[]} keyboard>
      {p || params.i ? null : (
        <>
          <AppText muted>Saisissez le code de la famille (8 caractères) ou collez le lien d’invitation reçu par e-mail.</AppText>
          <TextField
            label="Code ou lien"
            value={input}
            onChangeText={(text) => {
              setInput(text);
              preview.reset();
            }}
            placeholder="K7Q2-M9XD"
            autoCapitalize="characters"
            autoCorrect={false}
            error={preview.isError ? errorMessage(preview.error) : null}
          />
          <Button
            title="Continuer"
            disabled={!parsed}
            loading={preview.isPending}
            onPress={() => {
              if (!parsed) return;
              setCredential(parsed);
              preview.mutate(parsed);
            }}
          />
        </>
      )}

      {p ? (
        <>
          <Card tone="flat" style={styles.preview}>
            <AppText variant="label" muted>
              Invitation
            </AppText>
            <AppText variant="title">{p.familyName}</AppText>
            <AppText muted>
              {[p.inviterName ? `${p.inviterName} vous invite` : null, p.membersCount !== null ? `${p.membersCount} membre${p.membersCount > 1 ? "s" : ""}` : null]
                .filter(Boolean)
                .join(" · ")}
            </AppText>
          </Card>

          {p.alreadyMember ? (
            <>
              <AppText muted>Vous faites déjà partie de cette famille.</AppText>
              <Button title="Ouvrir la famille" onPress={() => router.replace({ pathname: "/famille/[id]", params: { id: p.familyId } })} />
            </>
          ) : (
            <>
              <SectionHeader title="Ce que vous partagez" />
              <View style={styles.chips}>
                {SHARING_ORDER.map((s) => (
                  <Chip key={s} label={SHARING[s].label} selected={sharing === s} onPress={() => setSharing(s)} />
                ))}
              </View>
              <AppText variant="caption" muted>
                {SHARING[sharing].description} Vous pourrez le changer à tout moment.
              </AppText>
              {joining.isError ? <AppText color={colors.danger}>{errorMessage(joining.error)}</AppText> : null}
              <Button
                title="Rejoindre"
                loading={joining.isPending}
                style={styles.join}
                onPress={() => {
                  if (invitation) accept.mutate({ invitationId: invitation.id, sharing }, { onSuccess: onJoined });
                  else if (credential) join.mutate({ credential, sharing }, { onSuccess: onJoined });
                }}
              />
            </>
          )}
        </>
      ) : null}

      {params.i && received.isSuccess && !invitation ? <AppText muted>Cette invitation n’est plus valable.</AppText> : null}

      {fromLink && preview.isError ? (
        <Button
          title="Saisir un code"
          variant="secondary"
          onPress={() => {
            preview.reset();
            setCredential(null);
          }}
        />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  preview: { gap: spacing.xs },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  join: { marginTop: spacing.md },
});
