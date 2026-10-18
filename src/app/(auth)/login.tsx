import { Link, router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { AuthHeader } from "@/components/AuthHeader";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { spacing, useColors } from "@/lib/theme";
import type { AuthResponse } from "@/lib/types";

export default function Login() {
  const colors = useColors();
  const signIn = useAuth((s) => s.signIn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      await signIn(await api<AuthResponse>("/auth/login", { method: "POST", body: { email, password }, auth: false }));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen keyboard edges={["top", "bottom"]}>
      <AuthHeader title="Bon retour" subtitle="Connectez-vous pour reprendre votre lecture et vos révisions." onBack={() => router.back()} />
      <View style={styles.form}>
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />
        <TextField
          label="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secure
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        {error ? <AppText color={colors.danger}>{error}</AppText> : null}
        <Button title="Se connecter" onPress={submit} loading={loading} disabled={!email || !password} />
        <Link href="/forgot-password" style={styles.link}>
          <AppText variant="bodyStrong" color={colors.primary}>
            Mot de passe oublié ?
          </AppText>
        </Link>
      </View>
      <View style={styles.footer}>
        <AppText muted>Pas encore de compte ?</AppText>
        <Link href="/register" replace>
          <AppText variant="bodyStrong" color={colors.primary}>
            Créer un compte
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  link: { alignSelf: "center", padding: spacing.sm },
  footer: { flexDirection: "row", justifyContent: "center", gap: spacing.xs, marginTop: spacing.xl },
});
