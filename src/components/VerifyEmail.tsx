import { useQueryClient } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { AuthHeader } from "@/components/AuthHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/States";
import { api, ApiError, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { closeScreen } from "@/lib/navigation";
import { keys } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";

type Status = { kind: "checking" } | { kind: "done" } | { kind: "missing" } | { kind: "failed"; expired: boolean; message: string };
type Resend = { kind: "idle" } | { kind: "sending" } | { kind: "sent" } | { kind: "already" } | { kind: "error"; message: string };

/**
 * Confirmation de l'adresse e-mail, ouverte depuis le lien reçu à l'inscription
 * (https://eqra.fr/verifier/?token=… ou eqra://verify-email?token=…). Même écran connecté
 * (`(app)/verify-email`) ou non (`(auth)/verify-email`) : `POST /auth/verify-email` est public ;
 * seul le renvoi de l'e-mail (`POST /me/verify-email/resend`) demande d'être connecté.
 */
export function VerifyEmail({ standalone = false }: { standalone?: boolean }) {
  const colors = useColors();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const signedIn = useAuth((s) => s.status === "signedIn");
  // `emailVerified` arrive avec le DTO `/me` (serveur à jour) ; absent sur un serveur plus ancien.
  const alreadyVerified = useAuth((s) => (s.user as { emailVerified?: boolean } | null)?.emailVerified === true);
  const client = useQueryClient();
  const [status, setStatus] = useState<Status>(token ? { kind: "checking" } : { kind: "missing" });
  const [resend, setResend] = useState<Resend>({ kind: "idle" });
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    let cancelled = false;
    api("/auth/verify-email", { method: "POST", body: { token }, auth: false })
      .then(() => {
        if (cancelled) return;
        setStatus({ kind: "done" });
        // Connecté : le bandeau « Confirmez votre adresse » disparaît dès que `/me` est relu.
        if (useAuth.getState().status === "signedIn") void client.invalidateQueries({ queryKey: keys.me });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const expired = error instanceof ApiError && error.status >= 400 && error.status < 500 && error.status !== 429;
        setStatus({ kind: "failed", expired, message: errorMessage(error) });
      });
    return () => {
      cancelled = true;
    };
  }, [token, client]);

  async function resendEmail() {
    setResend({ kind: "sending" });
    try {
      await api("/me/verify-email/resend", { method: "POST" });
      setResend({ kind: "sent" });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setResend({ kind: "already" });
      else setResend({ kind: "error", message: errorMessage(error) });
    }
  }

  const leave = () => (signedIn ? closeScreen("/") : router.replace("/login"));
  const leaveTitle = signedIn ? "Continuer" : "Se connecter";

  let body;
  if (status.kind === "checking") {
    body = <LoadingState label="Vérification du lien…" />;
  } else if (status.kind === "done") {
    body = (
      <View style={styles.stack}>
        <Card tone="accent">
          <AppText variant="bodyStrong">Adresse confirmée</AppText>
          <AppText muted>Merci. Vous pourrez récupérer votre compte par e-mail si vous oubliez votre mot de passe.</AppText>
        </Card>
        <Button title={leaveTitle} onPress={leave} />
      </View>
    );
  } else if (status.kind === "missing") {
    body = (
      <View style={styles.stack}>
        <Card>
          <AppText variant="bodyStrong">Ce lien est incomplet</AppText>
          <AppText muted>Ouvrez le lien directement depuis l’e-mail « Confirmez votre adresse », ou demandez-en un nouveau.</AppText>
        </Card>
        <ResendBlock signedIn={signedIn} alreadyVerified={alreadyVerified} resend={resend} onResend={resendEmail} />
        <Button title={leaveTitle} variant="secondary" onPress={leave} />
      </View>
    );
  } else {
    body = (
      <View style={styles.stack}>
        <Card>
          <AppText variant="bodyStrong">{status.expired ? "Ce lien n’est plus valable" : "Vérification impossible"}</AppText>
          <AppText muted>
            {alreadyVerified
              ? "Votre adresse est déjà confirmée : il n’y a rien d’autre à faire."
              : status.expired
                ? "Le lien a expiré (il est valable 48 heures) ou a déjà servi. Demandez un nouvel e-mail de confirmation."
                : status.message}
          </AppText>
        </Card>
        {alreadyVerified ? null : <ResendBlock signedIn={signedIn} alreadyVerified={alreadyVerified} resend={resend} onResend={resendEmail} />}
        <Button title={leaveTitle} variant={alreadyVerified ? "primary" : "secondary"} onPress={leave} />
      </View>
    );
  }

  if (standalone) {
    return (
      <Screen edges={["top", "bottom"]}>
        <AuthHeader title="Confirmer votre adresse" onBack={() => router.replace("/login")} />
        {body}
      </Screen>
    );
  }
  return (
    <Screen edges={[]}>
      <AppText variant="title" style={{ color: colors.text }}>
        Confirmer votre adresse
      </AppText>
      {body}
    </Screen>
  );
}

/** Bouton « Renvoyer l'e-mail » et son retour ; hors connexion, explique qu'il faut se connecter. */
function ResendBlock({
  signedIn,
  alreadyVerified,
  resend,
  onResend,
}: {
  signedIn: boolean;
  alreadyVerified: boolean;
  resend: Resend;
  onResend: () => void;
}) {
  const colors = useColors();
  if (!signedIn) {
    return <AppText muted>Connectez-vous à votre compte pour recevoir un nouvel e-mail de confirmation.</AppText>;
  }
  if (alreadyVerified) return null;
  if (resend.kind === "sent") {
    return (
      <Card tone="accent">
        <AppText variant="bodyStrong">E-mail envoyé</AppText>
        <AppText muted>Ouvrez le nouveau lien depuis ce téléphone. Il est valable 48 heures.</AppText>
      </Card>
    );
  }
  if (resend.kind === "already") {
    return (
      <Card tone="accent">
        <AppText variant="bodyStrong">Adresse déjà confirmée</AppText>
        <AppText muted>Il n’y a rien d’autre à faire.</AppText>
      </Card>
    );
  }
  return (
    <View style={styles.stack}>
      {resend.kind === "error" ? <AppText color={colors.danger}>{resend.message}</AppText> : null}
      <Button title="Renvoyer l’e-mail" onPress={onResend} loading={resend.kind === "sending"} />
    </View>
  );
}

const styles = StyleSheet.create({ stack: { gap: spacing.lg } });
