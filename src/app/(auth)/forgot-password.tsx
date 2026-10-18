import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { AuthHeader } from "@/components/AuthHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { api, errorMessage } from "@/lib/api";
import { spacing, useColors } from "@/lib/theme";

export default function ForgotPassword() {
  const colors = useColors();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await api("/auth/forgot-password", { method: "POST", body: { email }, auth: false });
      setSent(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen keyboard edges={["top", "bottom"]}>
      <AuthHeader
        title="Mot de passe oublié"
        subtitle="Recevez par e-mail un lien pour choisir un nouveau mot de passe."
        onBack={() => router.back()}
      />
      {sent ? (
        <Card tone="accent">
          <AppText variant="bodyStrong">Vérifiez votre boîte de réception</AppText>
          <AppText muted>
            Si un compte existe pour {email}, un lien valable une heure vient d’être envoyé. Ouvrez-le depuis ce téléphone.
          </AppText>
        </Card>
      ) : (
        <View style={styles.form}>
          <TextField label="E-mail" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
          {error ? <AppText color={colors.danger}>{error}</AppText> : null}
          <Button title="Envoyer le lien" onPress={submit} loading={loading} disabled={!email} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
