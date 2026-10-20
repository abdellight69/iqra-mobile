import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Alert, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { EmptyState, ErrorState, LoadingState } from "@/components/States";
import { errorMessage } from "@/lib/api";
import { useDeclineInvitation, useFamilies, useReceivedInvitations } from "@/lib/families";
import { useMe } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

/** Mes familles : des proches, chacun avec son compte, qui se fixent des objectifs et s’encouragent. */
export default function Families() {
  const colors = useColors();
  const me = useMe();
  const families = useFamilies();
  const child = me.data?.isChild ?? false;
  const received = useReceivedInvitations(!child);
  const decline = useDeclineInvitation();

  if (families.isPending) return <LoadingState />;
  if (families.isError) return <ErrorState error={families.error} onRetry={() => void families.refetch()} />;

  return (
    <Screen
      edges={[]}
      onRefresh={() => {
        void families.refetch();
        void received.refetch();
      }}
      refreshing={families.isRefetching}>
      {(received.data ?? []).map((inv) => (
        <Card key={inv.id} tone="accent" style={styles.invitation}>
          <AppText variant="label" muted>
            Invitation
          </AppText>
          <AppText variant="bodyStrong">
            {inv.inviterName ? `${inv.inviterName} vous invite dans « ${inv.familyName} »` : `Invitation dans « ${inv.familyName} »`}
          </AppText>
          <View style={styles.invitationButtons}>
            <Button
              title="Refuser"
              variant="ghost"
              size="md"
              onPress={() =>
                Alert.alert("Refuser l’invitation ?", `Vous ne rejoindrez pas « ${inv.familyName} ». On pourra vous réinviter.`, [
                  { text: "Annuler", style: "cancel" },
                  { text: "Refuser", style: "destructive", onPress: () => decline.mutate(inv.id, { onError: (e) => Alert.alert("Non refusée", errorMessage(e)) }) },
                ])
              }
            />
            <Button title="Voir et rejoindre" size="md" onPress={() => router.push({ pathname: "/famille/rejoindre", params: { i: inv.id } })} />
          </View>
        </Card>
      ))}
      {families.data.length === 0 && (received.data ?? []).length === 0 ? (
        <EmptyState
          icon="people-outline"
          title="Pas encore de famille"
          message={
            child
              ? "Le titulaire du compte peut t’ajouter à une famille."
              : "Créez votre famille et invitez vos proches, ou rejoignez celle qu’on vous a proposée. Chacun garde son compte et choisit ce qu’il partage."
          }
        />
      ) : (
        families.data.map((f) => (
          <Card key={f.id} onPress={() => router.push({ pathname: "/famille/[id]", params: { id: f.id } })} style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="people" size={20} color={colors.primary} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">{f.name}</AppText>
              <AppText variant="caption" muted>
                {plural(f.membersCount, "membre", "membres")} · {plural(f.activeGoals, "objectif", "objectifs")}
                {f.role === "admin" ? " · administrateur" : ""}
              </AppText>
              {f.pendingGoals > 0 || f.unseenEncouragements > 0 ? (
                <AppText variant="caption" color={colors.accent}>
                  {[
                    f.pendingGoals > 0 ? plural(f.pendingGoals, "objectif à accepter", "objectifs à accepter") : null,
                    f.unseenEncouragements > 0 ? plural(f.unseenEncouragements, "encouragement", "encouragements") : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </AppText>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </Card>
        ))
      )}

      {child ? null : (
        <View style={styles.actions}>
          <Button title="Créer une famille" icon="add" onPress={() => router.push("/famille/nouvelle")} />
          <Button title="Rejoindre avec un code ou un lien" icon="enter-outline" variant="secondary" onPress={() => router.push("/famille/rejoindre")} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  icon: { width: 44, height: 44, borderRadius: radius.pill, alignItems: "center", justifyContent: "center" },
  actions: { gap: spacing.sm, marginTop: spacing.md },
  invitation: { gap: spacing.xs },
  invitationButtons: { flexDirection: "row", justifyContent: "flex-end", gap: spacing.sm, marginTop: spacing.sm },
});
