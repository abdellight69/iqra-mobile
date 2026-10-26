import Ionicons from "@expo/vector-icons/Ionicons";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { dismissVerifyBanner, isVerifyBannerDismissed, needsEmailVerification, type ResendResult, resendVerificationEmail } from "@/lib/email-verification";
import { useMe } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { Card } from "./Card";

/**
 * Bandeau « Confirmez votre adresse e-mail » : visible pour le titulaire dont l'adresse n'est pas
 * confirmée, se ferme pour la session. Le bouton renvoie l'e-mail de confirmation.
 */
export function VerifyEmailBanner() {
  const colors = useColors();
  const me = useMe();
  const client = useQueryClient();
  const [hidden, setHidden] = useState(isVerifyBannerDismissed);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<ResendResult | null>(null);

  const user = me.data;
  if (hidden || !needsEmailVerification(user)) return null;

  function close() {
    dismissVerifyBanner();
    setHidden(true);
  }

  async function resend() {
    setSending(true);
    const outcome = await resendVerificationEmail();
    setSending(false);
    setResult(outcome);
    // Le serveur connaît l'adresse comme confirmée : le profil se met à jour et le bandeau disparaît.
    if (outcome.alreadyVerified) void client.invalidateQueries({ queryKey: ["me"] });
  }

  return (
    <Card tone="accent" style={styles.card} accessibilityRole="alert">
      <View style={styles.header}>
        <Ionicons name="mail-unread-outline" size={20} color={colors.accent} />
        <AppText variant="bodyStrong" style={styles.flex}>
          Confirmez votre adresse e-mail
        </AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Fermer" hitSlop={10} onPress={close}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </View>
      <AppText variant="caption" muted>
        {user?.email ? `Un lien de confirmation a été envoyé à ${user.email}.` : "Un lien de confirmation vous a été envoyé."} Sans confirmation, vous ne pourrez pas récupérer votre mot de passe.
      </AppText>
      {result ? (
        <AppText variant="caption" color={result.ok ? colors.success : colors.danger}>
          {result.message}
        </AppText>
      ) : null}
      <Button title="Renvoyer l’e-mail" size="md" variant="secondary" icon="send-outline" loading={sending} disabled={result?.ok} onPress={() => void resend()} />
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
});
