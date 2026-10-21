import Ionicons from "@expo/vector-icons/Ionicons";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { SectionHeader } from "@/components/SectionHeader";
import { EmptyState, LoadingState } from "@/components/States";
import { SupporterBadge } from "@/components/SupporterBadge";
import { errorMessage } from "@/lib/api";
import {
  buySupportOffer,
  isCancelled,
  loadSupportOffers,
  manageSupport,
  PRIVACY_URL,
  purchasesEnabled,
  restoreSupport,
  type SupportOffer,
  TERMS_URL,
} from "@/lib/purchases";
import { useMe, useSupporterSync } from "@/lib/queries";
import { radius, spacing, useColors } from "@/lib/theme";

const PERKS: { icon: "sparkles-outline" | "color-palette-outline" | "rocket-outline"; text: string }[] = [
  { icon: "sparkles-outline", text: "Un badge « Soutien » à côté de votre nom, dans vos familles" },
  { icon: "color-palette-outline", text: "Deux thèmes de couleurs en plus : Bleu nuit et Terracotta" },
  { icon: "rocket-outline", text: "Les nouveautés en avant-première" },
];

/** Abonnement « Soutien » (docs/soutien-v1.md) : facultatif, l'apprentissage reste gratuit pour tous. */
export default function Soutien() {
  const colors = useColors();
  const me = useMe();
  const sync = useSupporterSync();
  const [busy, setBusy] = useState<string | null>(null);
  const user = me.data;
  // L'abonnement appartient au compte : seul le titulaire (adulte) achète.
  const ownerId = user && user.isOwner !== false && !user.isChild ? user.id : null;
  const offers = useQuery({
    queryKey: ["support-offers", ownerId],
    queryFn: () => loadSupportOffers(ownerId!),
    enabled: purchasesEnabled && ownerId !== null,
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (!user) return <LoadingState />;
  if (!purchasesEnabled) {
    return <EmptyState icon="sparkles-outline" title="Bientôt disponible" message="L'abonnement Soutien arrive prochainement. Eqra reste entièrement gratuite." />;
  }
  if (!ownerId) {
    return (
      <EmptyState
        icon="lock-closed-outline"
        title="Réservé au titulaire du compte"
        message="Le titulaire du compte peut souscrire depuis son propre profil ; tous les profils en profitent."
        action={{ title: "Retour", onPress: () => router.back() }}
      />
    );
  }

  /** Après un achat ou une restauration, le serveur relit l'abonnement : badge et thèmes suivent. */
  async function run(key: string, action: () => Promise<void>, thanks: string | null) {
    setBusy(key);
    try {
      await action();
      const synced = await sync.mutateAsync().catch(() => null);
      if (thanks) Alert.alert("Merci !", synced || key === "tip" ? thanks : `${thanks} Le badge apparaîtra dans quelques instants.`);
      else Alert.alert("Achats restaurés", synced?.supporter ? "Votre abonnement Soutien est actif." : "Aucun abonnement Soutien en cours sur ce compte.");
    } catch (error) {
      if (!isCancelled(error)) Alert.alert("Paiement impossible", errorMessage(error));
    } finally {
      setBusy(null);
    }
  }

  const buy = (offer: SupportOffer) =>
    run(
      offer.id,
      () => buySupportOffer(ownerId, offer),
      offer.id === "tip" ? "Votre geste aide Eqra à continuer." : "Votre abonnement Soutien est actif. Les thèmes sont à choisir dans Réglages.",
    );

  return (
    <Screen>
      <View style={styles.hero}>
        <View style={[styles.heroIcon, { backgroundColor: colors.accentSoft }]}>
          <Ionicons name="sparkles" size={28} color={colors.accent} />
        </View>
        <AppText variant="title" center>
          Soutenir Eqra
        </AppText>
        <AppText muted center>
          Eqra est et restera entièrement gratuite : leçons, vocabulaire, révisions et familles, sans limite. Si l&apos;app vous est utile, un
          abonnement Soutien aide à payer le serveur et le temps consacré à l&apos;améliorer.
        </AppText>
      </View>

      {user.supporter ? (
        <Card style={styles.active}>
          <View style={styles.activeRow}>
            <AppText variant="bodyStrong">Merci pour votre soutien</AppText>
            <SupporterBadge />
          </View>
          <AppText variant="caption" muted>
            Votre abonnement est actif sur tous les profils du compte.
          </AppText>
          <Button title="Gérer mon abonnement" variant="secondary" size="md" onPress={() => void manageSupport(ownerId).catch(() => undefined)} />
        </Card>
      ) : null}

      <SectionHeader title="En remerciement" />
      <Card style={styles.perks}>
        {PERKS.map((perk) => (
          <View key={perk.text} style={styles.perk}>
            <Ionicons name={perk.icon} size={20} color={colors.primary} />
            <AppText style={styles.flex}>{perk.text}</AppText>
          </View>
        ))}
      </Card>

      <SectionHeader title="Formules" />
      {offers.isPending ? (
        <ActivityIndicator color={colors.primary} style={styles.loading} />
      ) : offers.isError || offers.data.length === 0 ? (
        <Card style={styles.perks}>
          <AppText muted>La boutique est momentanément indisponible. Réessayez dans un instant.</AppText>
          <Button title="Réessayer" variant="secondary" size="md" onPress={() => void offers.refetch()} />
        </Card>
      ) : (
        <View style={styles.offers}>
          {offers.data
            .filter((offer) => !(user.supporter && offer.id !== "tip"))
            .map((offer) => (
              <Pressable
                key={offer.id}
                accessibilityRole="button"
                accessibilityLabel={`${offer.title}, ${offer.price}`}
                disabled={busy !== null}
                onPress={() => void buy(offer)}
                style={({ pressed }) => [
                  styles.offer,
                  {
                    backgroundColor: offer.id === "annual" ? colors.primarySoft : colors.surface,
                    borderColor: offer.id === "annual" ? colors.primary : colors.border,
                    opacity: pressed || (busy !== null && busy !== offer.id) ? 0.6 : 1,
                  },
                ]}>
                <View style={styles.flex}>
                  <AppText variant="bodyStrong">{offer.title}</AppText>
                  <AppText variant="caption" muted>
                    {offer.detail}
                  </AppText>
                </View>
                {busy === offer.id ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <AppText variant="bodyStrong" color={colors.primary}>
                    {offer.price}
                  </AppText>
                )}
              </Pressable>
            ))}
        </View>
      )}

      <AppText variant="caption" faint style={styles.legal}>
        L&apos;abonnement se renouvelle automatiquement au même prix, sauf résiliation au moins 24 heures avant la fin de la période, depuis les
        réglages de votre compte App Store ou Google Play. Le paiement est débité à la confirmation de l&apos;achat.
      </AppText>

      <Button
        title="Restaurer mes achats"
        variant="ghost"
        size="md"
        loading={busy === "restore"}
        disabled={busy !== null}
        onPress={() => void run("restore", () => restoreSupport(ownerId), null)}
      />
      <View style={styles.links}>
        <Pressable accessibilityRole="link" hitSlop={8} onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}>
          <AppText variant="caption" color={colors.primary}>
            Conditions d&apos;utilisation
          </AppText>
        </Pressable>
        <AppText variant="caption" faint>
          ·
        </AppText>
        <Pressable accessibilityRole="link" hitSlop={8} onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}>
          <AppText variant="caption" color={colors.primary}>
            Confidentialité
          </AppText>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  hero: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.lg },
  heroIcon: { width: 64, height: 64, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: spacing.xs },
  active: { gap: spacing.sm },
  activeRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  perks: { gap: spacing.md },
  perk: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  loading: { marginVertical: spacing.xl },
  offers: { gap: spacing.sm },
  offer: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.lg,
    minHeight: 64,
  },
  legal: { marginTop: spacing.lg },
  links: { flexDirection: "row", justifyContent: "center", gap: spacing.sm, marginBottom: spacing.xl },
});
