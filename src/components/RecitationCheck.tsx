import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { MAX_RECORDING_SECONDS, type RecitationState } from "@/lib/recitation";
import { fonts, radius, spacing, useColors } from "@/lib/theme";
import type { RecitationCheck, RecitationWordStatus } from "@/lib/types";
import { AppText } from "./AppText";
import { Button } from "./Button";
import { Card } from "./Card";

const formatSeconds = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Couleurs d'un mot selon le résultat de la vérification (rien de particulier s'il est reconnu). */
export function useStatusColors() {
  const colors = useColors();
  return (status: RecitationWordStatus | undefined) =>
    status === "missed"
      ? { text: colors.danger, background: colors.dangerSoft }
      : status === "different"
        ? { text: colors.accent, background: colors.accentSoft }
        : null;
}

/** Enregistrement de la récitation : démarrer, arrêter, puis analyse par le serveur. */
export function RecitationRecorder({
  state,
  seconds,
  onStart,
  onStop,
  onCancel,
}: {
  state: RecitationState;
  seconds: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
}) {
  const colors = useColors();

  if (state.phase === "recording") {
    return (
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: colors.danger }]} />
          <AppText variant="bodyStrong" style={styles.flex}>
            Enregistrement… {formatSeconds(seconds)}
          </AppText>
          <Pressable accessibilityRole="button" onPress={onCancel} hitSlop={8}>
            <AppText variant="caption" muted>
              Annuler
            </AppText>
          </Pressable>
        </View>
        <AppText variant="caption" muted>
          Récitez le verset, puis touchez « Terminer ». Arrêt automatique après {MAX_RECORDING_SECONDS / 60} minutes.
        </AppText>
        <Button title="Terminer et vérifier" icon="stop" onPress={onStop} />
      </Card>
    );
  }

  if (state.phase === "checking") {
    return (
      <Card style={[styles.card, styles.row]}>
        <ActivityIndicator color={colors.primary} />
        <AppText variant="bodyStrong">Analyse de votre récitation…</AppText>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Ionicons name="mic-outline" size={22} color={colors.primary} />
        <View style={styles.flex}>
          <AppText variant="bodyStrong">Vérifier à la voix</AppText>
          <AppText variant="caption" muted>
            Récitez à voix haute : l’application repère les mots oubliés. L’enregistrement est envoyé au serveur pour analyse,
            puis supprimé.
          </AppText>
        </View>
      </View>
      {state.phase === "error" ? (
        <AppText variant="caption" color={colors.danger}>
          {state.message}
        </AppText>
      ) : null}
      <Button title={state.phase === "error" ? "Réessayer" : "Réciter à voix haute"} icon="mic" variant="secondary" onPress={onStart} />
    </Card>
  );
}

/** Bilan de la vérification : mots reconnus, oubliés, différents, et ce qui a été entendu. */
export function RecitationSummary({ result }: { result: RecitationCheck }) {
  const colors = useColors();
  const statusColors = useStatusColors();
  const [showHeard, setShowHeard] = useState(false);
  const { ok, total, missed, different } = result.summary;
  const issues = result.words.filter((w) => w.status !== "ok");

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Ionicons
          name={issues.length === 0 ? "checkmark-circle" : "alert-circle-outline"}
          size={24}
          color={issues.length === 0 ? colors.success : colors.accent}
        />
        <AppText variant="headline" style={styles.flex}>
          {ok} mot{ok > 1 ? "s" : ""} reconnu{ok > 1 ? "s" : ""} sur {total}
        </AppText>
      </View>
      {missed + different > 0 ? (
        <AppText variant="caption" muted>
          {[missed > 0 ? `${missed} oublié${missed > 1 ? "s" : ""}` : null, different > 0 ? `${different} différent${different > 1 ? "s" : ""}` : null]
            .filter(Boolean)
            .join(" · ")}
        </AppText>
      ) : null}

      {issues.map((w) => {
        const tone = statusColors(w.status)!;
        return (
          <View key={w.location} style={styles.issue}>
            <View style={[styles.wordChip, { backgroundColor: tone.background }]}>
              <AppText style={[styles.arabic, { color: tone.text }]}>{w.textUthmani}</AppText>
            </View>
            <AppText variant="caption" muted style={styles.flex}>
              {w.status === "missed" ? "Non entendu" : `Entendu : ${w.heard ?? ""}`}
            </AppText>
          </View>
        );
      })}

      <Pressable accessibilityRole="button" onPress={() => setShowHeard((s) => !s)} style={styles.link}>
        <AppText variant="caption" color={colors.primary}>
          {showHeard ? "Masquer ce qui a été entendu" : "Voir ce qui a été entendu"}
        </AppText>
      </Pressable>
      {showHeard ? (
        <AppText style={[styles.arabic, styles.heard, { color: colors.arabic }]}>{result.heard || "(rien)"}</AppText>
      ) : null}

      <AppText variant="caption" muted>
        Résultat indicatif : la reconnaissance automatique peut se tromper, surtout avec du bruit ou une récitation très rapide.
        Le tajwid n’est pas évalué.
      </AppText>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { gap: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dot: { width: 12, height: 12, borderRadius: 6 },
  issue: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  wordChip: { borderRadius: radius.sm, paddingHorizontal: spacing.sm },
  arabic: { fontFamily: fonts.arabic, fontSize: 22, lineHeight: 40 },
  heard: { writingDirection: "rtl", textAlign: "right" },
  link: { alignSelf: "flex-start" },
});
