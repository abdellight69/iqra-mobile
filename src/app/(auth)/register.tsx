import Ionicons from "@expo/vector-icons/Ionicons";
import { Link, router } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { AuthHeader } from "@/components/AuthHeader";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { ApiError, api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { PRIVACY_URL, TERMS_URL } from "@/lib/legal";
import { spacing, useColors } from "@/lib/theme";
import type { AuthResponse } from "@/lib/types";

type FieldErrors = Partial<Record<"displayName" | "email" | "password" | "confirm" | "acceptTerms", string>>;

export default function Register() {
  const colors = useColors();
  const signIn = useAuth((s) => s.signIn);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    const local: FieldErrors = {};
    if (displayName.trim().length < 2) local.displayName = "Indiquez au moins 2 caractères";
    if (password.length < 8) local.password = "Au moins 8 caractères";
    if (confirm !== password) local.confirm = "Les mots de passe ne correspondent pas";
    if (!accepted) local.acceptTerms = "Cochez la case pour créer votre compte";
    setErrors(local);
    setFormError(null);
    if (Object.keys(local).length > 0) return;

    setLoading(true);
    try {
      await signIn(
        await api<AuthResponse>("/auth/register", { method: "POST", body: { displayName, email, password, acceptTerms: true }, auth: false }),
      );
    } catch (e) {
      if (e instanceof ApiError && e.details) {
        setErrors(Object.fromEntries(e.details.map((d) => [d.path, d.message])) as FieldErrors);
      } else {
        setFormError(errorMessage(e));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen keyboard edges={["top", "bottom"]}>
      <AuthHeader title="Créer un compte" subtitle="Votre progression sera sauvegardée et synchronisée." onBack={() => router.back()} />
      <View style={styles.form}>
        <TextField label="Prénom ou pseudo" value={displayName} onChangeText={setDisplayName} autoComplete="name" error={errors.displayName} />
        <TextField
          label="E-mail"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          error={errors.email}
        />
        <TextField label="Mot de passe" value={password} onChangeText={setPassword} secure autoComplete="new-password" error={errors.password} />
        <TextField label="Confirmer le mot de passe" value={confirm} onChangeText={setConfirm} secure autoComplete="new-password" error={errors.confirm} />
        <View>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: accepted }}
            accessibilityLabel="J'ai au moins 15 ans et j'accepte les conditions d'utilisation et la politique de confidentialité"
            hitSlop={6}
            onPress={() => {
              setAccepted((a) => !a);
              setErrors((e) => ({ ...e, acceptTerms: undefined }));
            }}
            style={styles.terms}>
            <Ionicons
              name={accepted ? "checkbox" : "square-outline"}
              size={24}
              color={accepted ? colors.primary : errors.acceptTerms ? colors.danger : colors.textMuted}
            />
            <AppText muted style={styles.termsText}>
              J&apos;ai au moins 15 ans et j&apos;accepte les{" "}
              <AppText color={colors.primary} onPress={() => void WebBrowser.openBrowserAsync(TERMS_URL)}>
                conditions d&apos;utilisation
              </AppText>{" "}
              et la{" "}
              <AppText color={colors.primary} onPress={() => void WebBrowser.openBrowserAsync(PRIVACY_URL)}>
                politique de confidentialité
              </AppText>
              .
            </AppText>
          </Pressable>
          {errors.acceptTerms ? (
            <AppText variant="caption" color={colors.danger} style={styles.termsError}>
              {errors.acceptTerms}
            </AppText>
          ) : null}
        </View>
        {formError ? <AppText color={colors.danger}>{formError}</AppText> : null}
        <Button title="Créer mon compte" onPress={submit} loading={loading} disabled={!email || !password || !displayName} />
      </View>
      <View style={styles.footer}>
        <AppText muted>Déjà inscrit ?</AppText>
        <Link href="/login" replace>
          <AppText variant="bodyStrong" color={colors.primary}>
            Se connecter
          </AppText>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  terms: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  termsText: { flex: 1 },
  termsError: { marginTop: spacing.xs, marginLeft: 24 + spacing.md },
  footer: { flexDirection: "row", justifyContent: "center", gap: spacing.xs, marginTop: spacing.xl },
});
