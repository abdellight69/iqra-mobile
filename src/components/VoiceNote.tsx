import Ionicons from "@expo/vector-icons/Ionicons";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Button } from "@/components/Button";
import { duration } from "@/lib/missions-format";
import { radius, spacing, useColors } from "@/lib/theme";
import { MAX_VOICE_NOTE_SECONDS, useVoiceNotePlayer, useVoiceRecorder, type VoiceNote } from "@/lib/voice-note";

/** Lecture d'un vocal déjà envoyé : bouton lecture/pause et durée. */
export function VoicePlayButton({ id, durationMs, label = "Écouter le message vocal" }: { id: string; durationMs?: number | null; label?: string }) {
  const colors = useColors();
  const player = useVoiceNotePlayer();
  const playing = player.playingId === id;
  return (
    <View style={styles.playRow}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={playing ? "Mettre en pause" : label}
        onPress={() => void player.toggle(id)}
        style={({ pressed }) => [styles.play, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
        {player.loadingId === id ? (
          <ActivityIndicator color={colors.onPrimary} />
        ) : (
          <Ionicons name={playing ? "pause" : "play"} size={20} color={colors.onPrimary} />
        )}
      </Pressable>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{playing ? "Lecture…" : "Message vocal"}</AppText>
        {player.error ? (
          <AppText variant="caption" color={colors.danger}>
            {player.error}
          </AppText>
        ) : durationMs ? (
          <AppText variant="caption" muted>
            {duration(durationMs)}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Message vocal d'un parent : enregistrer, réécouter, refaire ou retirer. L'enregistrement est
 * envoyé dès qu'il s'arrête ; `value` porte l'identifiant du vocal choisi.
 */
export function VoiceNoteField({
  value,
  onChange,
  recordLabel = "Enregistrer un message vocal",
}: {
  value: VoiceNote | null;
  onChange: (note: VoiceNote | null) => void;
  recordLabel?: string;
}) {
  const colors = useColors();
  const recorder = useVoiceRecorder(onChange);
  const { state } = recorder;

  if (state.phase === "recording") {
    return (
      <View style={[styles.box, { backgroundColor: colors.dangerSoft }]}>
        <View style={[styles.dot, { backgroundColor: colors.danger }]} />
        <AppText variant="bodyStrong" style={styles.flex}>
          {duration(recorder.seconds * 1000)} / {duration(MAX_VOICE_NOTE_SECONDS * 1000)}
        </AppText>
        <Button title="Arrêter" icon="stop" size="md" variant="danger" onPress={() => void recorder.stop()} />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      {state.phase === "uploading" ? (
        <View style={[styles.box, { backgroundColor: colors.surfaceMuted }]}>
          <ActivityIndicator color={colors.primary} />
          <AppText muted>Envoi du message vocal…</AppText>
        </View>
      ) : value ? (
        <View style={[styles.box, { backgroundColor: colors.primarySoft }]}>
          <View style={styles.flex}>
            <VoicePlayButton id={value.id} durationMs={value.durationMs} />
          </View>
          <Button title="Refaire" variant="ghost" size="md" onPress={() => void recorder.start()} />
          <Pressable accessibilityRole="button" accessibilityLabel="Retirer le message vocal" hitSlop={8} onPress={() => onChange(null)} style={styles.remove}>
            <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <>
          <Button title={recordLabel} icon="mic-outline" variant="secondary" size="md" onPress={() => void recorder.start()} />
          <AppText variant="caption" muted>
            Le message est envoyé au serveur et conservé pour les enfants du compte, jusqu’à ce que vous le remplaciez ou que la mission se termine.
          </AppText>
        </>
      )}
      {state.phase === "error" ? (
        <AppText variant="caption" color={colors.danger}>
          {state.message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { gap: spacing.sm },
  box: { flexDirection: "row", alignItems: "center", gap: spacing.md, borderRadius: radius.md, padding: spacing.sm, paddingLeft: spacing.md, minHeight: 60 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  playRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  remove: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
});
