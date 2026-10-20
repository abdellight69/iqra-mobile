import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Chip } from "@/components/FamilyGoalCard";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { ErrorState, LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { errorMessage } from "@/lib/api";
import { useDeleteFamily, useFamily, useRemoveMember, useRenameFamily, useUpdateMember } from "@/lib/families";
import { SHARING, SHARING_ORDER } from "@/lib/families-format";
import { spacing, useColors } from "@/lib/theme";
import type { FamilyMember } from "@/lib/types";

/** Ma participation : ce que je partage (et mes profils), quitter ; réglages de la famille (admin). */
export default function FamilySettings() {
  const colors = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const family = useFamily(id);
  const update = useUpdateMember(id);
  const remove = useRemoveMember(id);
  const rename = useRenameFamily(id);
  const destroy = useDeleteFamily(id);
  const [name, setName] = useState<string | null>(null);

  if (family.isPending) return <LoadingState />;
  if (family.isError) return <ErrorState error={family.error} onRetry={() => void family.refetch()} />;
  const f = family.data;
  const mine = f.members.filter((m) => m.isMine);
  const me = mine.find((m) => m.isMe);

  const leave = () =>
    Alert.alert(
      "Quitter la famille ?",
      mine.length > 1 ? "Les profils de votre compte la quittent avec vous. Les autres ne verront plus votre progression." : "Les autres ne verront plus votre progression.",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Quitter",
          style: "destructive",
          onPress: () =>
            me &&
            remove.mutate(me.userId, {
              onSuccess: () => router.dismissTo("/famille"),
              onError: (error) => Alert.alert("Impossible de quitter", errorMessage(error)),
            }),
        },
      ],
    );

  return (
    <Screen edges={[]} keyboard>
      <SectionHeader title="Ce que je partage" />
      {mine.map((m) => (
        <SharingCard
          key={m.userId}
          member={m}
          onChange={(sharing) => update.mutate({ userId: m.userId, sharing }, { onError: (error) => Alert.alert("Non enregistré", errorMessage(error)) })}
        />
      ))}

      {mine
        .filter((m) => !m.isMe)
        .map((m) => (
          <Button
            key={`remove-${m.userId}`}
            title={`Retirer ${m.displayName} de la famille`}
            variant="ghost"
            onPress={() => remove.mutate(m.userId, { onError: (error) => Alert.alert("Non retiré", errorMessage(error)) })}
          />
        ))}

      {f.myRole === "admin" ? (
        <>
          <SectionHeader title="Réglages de la famille" />
          <TextField label="Nom" value={name ?? f.name} onChangeText={setName} maxLength={60} error={rename.isError ? errorMessage(rename.error) : null} />
          <Button
            title="Renommer"
            variant="secondary"
            disabled={!name || name.trim() === f.name || !name.trim()}
            loading={rename.isPending}
            onPress={() => name && rename.mutate(name.trim(), { onSuccess: () => setName(null) })}
          />
        </>
      ) : null}

      <View style={styles.danger}>
        <Button title="Quitter la famille" variant="danger" loading={remove.isPending} onPress={leave} />
        {f.myRole === "admin" ? (
          <Button
            title="Supprimer la famille"
            variant="ghost"
            loading={destroy.isPending}
            onPress={() =>
              Alert.alert("Supprimer la famille ?", "Ses objectifs et encouragements sont effacés pour tous les membres. Chacun garde sa propre progression.", [
                { text: "Annuler", style: "cancel" },
                {
                  text: "Supprimer",
                  style: "destructive",
                  onPress: () => destroy.mutate(undefined, { onSuccess: () => router.dismissTo("/famille") }),
                },
              ])
            }
          />
        ) : null}
        <AppText variant="caption" muted center style={{ color: colors.textMuted }}>
          Quitter ou supprimer la famille n’efface jamais votre progression personnelle.
        </AppText>
      </View>
    </Screen>
  );
}

function SharingCard({ member, onChange }: { member: FamilyMember; onChange: (sharing: FamilyMember["sharing"]) => void }) {
  return (
    <Card style={styles.card}>
      <AppText variant="bodyStrong">{member.isMe ? "Moi" : member.displayName}</AppText>
      <View style={styles.chips}>
        {SHARING_ORDER.map((s) => (
          <Chip key={s} label={SHARING[s].label} selected={member.sharing === s} onPress={() => onChange(s)} />
        ))}
      </View>
      <AppText variant="caption" muted>
        {SHARING[member.sharing].description}
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  danger: { gap: spacing.sm, marginTop: spacing.xl },
});
