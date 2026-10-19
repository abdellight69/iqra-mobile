import { router, useLocalSearchParams } from "expo-router";
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

/** Ouvert depuis le lien reçu par e-mail : eqra://reset-password?token=… */
export default function ResetPassword() {
  const colors = useColors();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    if (password !== confirm) return setError("Les mots de passe ne correspondent pas");
    setError(null);
    setLoading(true);
    try {
      await api("/auth/reset-password", { method: "POST", body: { token, password }, auth: false });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen keyboard edges={["top", "bottom"]}>
      <AuthHeader title="Nouveau mot de passe" onBack={() => router.replace("/login")} />
      {!token ? (
        <Card>
          <AppText>Ce lien est incomplet. Demandez un nouveau lien de réinitialisation.</AppText>
        </Card>
      ) : done ? (
        <View style={styles.form}>
          <Card tone="accent">
            <AppText variant="bodyStrong">Mot de passe modifié</AppText>
            <AppText muted>Vous pouvez maintenant vous connecter. Vos autres sessions ont été fermées.</AppText>
          </Card>
          <Button title="Se connecter" onPress={() => router.replace("/login")} />
        </View>
      ) : (
        <View style={styles.form}>
          <TextField label="Nouveau mot de passe" value={password} onChangeText={setPassword} secure autoComplete="new-password" />
          <TextField label="Confirmer" value={confirm} onChangeText={setConfirm} secure autoComplete="new-password" />
          {error ? <AppText color={colors.danger}>{error}</AppText> : null}
          <Button title="Enregistrer" onPress={submit} loading={loading} disabled={password.length < 8} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({ form: { gap: spacing.lg } });
