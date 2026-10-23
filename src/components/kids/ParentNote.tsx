import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { RoundButton } from "@/components/kids/KidButton";
import { KID_TONES, KIDS, useKidsColors } from "@/lib/kids";
import { radius, spacing } from "@/lib/theme";
import type { VerseNote } from "@/lib/types";
import { useVoiceNotePlayer } from "@/lib/voice-note";

/** L'explication laissée par un parent pour un verset : son initiale, son texte, son vocal. */
export function ParentNote({ note }: { note: VerseNote }) {
  const kc = useKidsColors();
  const player = useVoiceNotePlayer();
  const name = note.authorName ?? "ta famille";
  const violet = kc.tint("violet");
  const playing = note.audioId !== null && player.playingId === note.audioId;
  return (
    <View style={[styles.note, { backgroundColor: violet.bg }]}>
      <View style={[styles.avatar, { backgroundColor: KID_TONES.violet.main }]} aria-hidden>
        <AppText variant="headline" color={KIDS.onHero}>
          {name.charAt(0).toUpperCase()}
        </AppText>
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{name} t’explique</AppText>
        <AppText variant="caption" color={violet.ink}>
          {note.text ?? (playing ? "Lecture…" : "Touche pour écouter l’explication")}
        </AppText>
        {note.audioId && player.error ? (
          <AppText variant="caption" color={KID_TONES.pink.edge}>
            {player.error}
          </AppText>
        ) : null}
      </View>
      {note.audioId ? (
        <RoundButton
          icon={playing ? "pause" : "play"}
          label={playing ? "Mettre en pause" : `Écouter l’explication de ${name}`}
          tone="violet"
          size={44}
          onPress={() => void player.toggle(note.audioId!)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  note: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, borderRadius: radius.lg, padding: spacing.sm + 2 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
});
