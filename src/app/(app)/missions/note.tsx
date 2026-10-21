import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { Screen } from "@/components/Screen";
import { LoadingState } from "@/components/States";
import { TextField } from "@/components/TextField";
import { VoiceNoteField } from "@/components/VoiceNote";
import { errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useDeleteVerseNote, useSaveVerseNote, useVerseNotes } from "@/lib/missions";
import { useVerse } from "@/lib/queries";
import { spacing, useColors } from "@/lib/theme";
import type { VerseNote } from "@/lib/types";
import type { VoiceNote } from "@/lib/voice-note";

/** Expliquer un verset avec ses mots : pour tous les enfants du compte, et pour toutes les missions. */
export default function VerseNoteScreen() {
  const { verseKey } = useLocalSearchParams<{ verseKey: string }>();
  const notes = useVerseNotes([verseKey]);
  if (notes.isPending) return <LoadingState />;
  // L'explication déjà enregistrée (ou aucune, si la lecture a échoué) remplit le formulaire.
  return <NoteForm verseKey={verseKey} existing={notes.data?.[verseKey] ?? null} />;
}

function NoteForm({ verseKey, existing }: { verseKey: string; existing: VerseNote | null }) {
  const colors = useColors();
  const translationId = useAuth((s) => s.user?.translationId ?? null);
  const verse = useVerse(verseKey, translationId);
  const save = useSaveVerseNote();
  const remove = useDeleteVerseNote();
  const [text, setText] = useState(existing?.text ?? "");
  const [voice, setVoice] = useState<VoiceNote | null>(existing?.audioId ? { id: existing.audioId, durationMs: 0 } : null);
  const empty = !text.trim() && !voice;

  return (
    <Screen edges={[]} keyboard>
      <Card style={styles.gap}>
        <AppText variant="label" muted>
          Sourate {verseKey.replace(":", ", verset ")}
        </AppText>
        {verse.data ? (
          <>
            <ArabicText size="lg">{verse.data.textUthmani}</ArabicText>
            {verse.data.translation ? <AppText muted>{verse.data.translation.text}</AppText> : null}
          </>
        ) : null}
      </Card>

      <Card style={styles.gap}>
        <VoiceNoteField value={voice} onChange={setVoice} recordLabel="L’expliquer à voix haute" />
        <TextField label="Votre explication, avec vos mots" value={text} onChangeText={(v) => setText(v.slice(0, 2000))} multiline />
        <AppText variant="caption" faint>
          Votre explication reste dans la famille : seuls les profils de ce compte la voient. Elle s’ajoute à celle d’Eqra, sans la remplacer.
        </AppText>
      </Card>

      {save.isError ? <AppText color={colors.danger}>{errorMessage(save.error)}</AppText> : null}
      <View style={styles.gap}>
        <Button
          title="Enregistrer l’explication"
          loading={save.isPending}
          disabled={empty}
          onPress={() => save.mutate({ verseKey, text: text.trim() || null, audioId: voice?.id ?? null }, { onSuccess: () => router.back() })}
        />
        {existing ? (
          <Button
            title="Supprimer l’explication"
            variant="ghost"
            loading={remove.isPending}
            onPress={() =>
              Alert.alert("Supprimer l’explication ?", "Les enfants du compte ne la verront plus.", [
                { text: "Annuler", style: "cancel" },
                { text: "Supprimer", style: "destructive", onPress: () => remove.mutate(verseKey, { onSuccess: () => router.back(), onError: (e) => Alert.alert("Non supprimée", errorMessage(e)) }) },
              ])
            }
          />
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gap: { gap: spacing.md },
});
