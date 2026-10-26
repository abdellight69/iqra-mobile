import Ionicons from "@expo/vector-icons/Ionicons";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "@/lib/a11y";
import { errorMessage } from "@/lib/api";
import { SLEEP_TIMER_CHOICES, sleepRemaining } from "@/lib/listening";
import { formatRate, usePlayback } from "@/lib/playback-store";
import { useMe, useRecitations } from "@/lib/queries";
import { groupRecitations } from "@/lib/recitations";
import { useReaderSettings } from "@/lib/reader-store";
import { radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";
import { RecitationGroupHeader } from "./RecitationGroupHeader";

/** Options du lecteur de sourate : lecture continue, minuteur de sommeil, récitateur de cette sourate, vitesse. */
export function PlayerSheet({ visible, chapterId, onClose }: { visible: boolean; chapterId: number; onClose: () => void }) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { rate, cycleRate } = usePlayback();
  const settings = useReaderSettings();
  const me = useMe();
  const recitations = useRecitations();
  const chosen = settings.recitationBySurah[chapterId] ?? null;
  const defaultReciter = recitations.data?.find((r) => r.id === me.data?.recitationId);

  // Temps restant du minuteur, rafraîchi toutes les 30 s tant que la feuille est ouverte.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (settings.sleepEndsAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, [settings.sleepEndsAt]);
  const remaining = sleepRemaining(settings.sleepEndsAt, now);

  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? "fade" : "slide"} onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <AppText variant="title">Options du lecteur</AppText>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.row}>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Lecture continue</AppText>
              <AppText variant="caption" muted>
                À la fin de la sourate, la suivante commence toute seule.
              </AppText>
            </View>
            <Switch
              accessibilityLabel="Lecture continue"
              value={settings.continuousPlayback}
              trackColor={{ true: colors.primary, false: colors.border }}
              onValueChange={settings.toggleContinuousPlayback}
            />
          </View>

          <View style={styles.section}>
            <AppText variant="label" muted>
              Minuteur de sommeil
            </AppText>
            <View style={styles.chips}>
              {SLEEP_TIMER_CHOICES.map((minutes) => (
                <Chip
                  key={minutes}
                  label={minutes === 0 ? "Aucun" : `${minutes} min`}
                  selected={settings.sleepTimerMinutes === minutes}
                  onPress={() => settings.setSleepTimerMinutes(minutes)}
                />
              ))}
            </View>
            <AppText variant="caption" muted>
              {remaining ? `La récitation s’arrêtera dans ${remaining}.` : "La récitation s’arrête d’elle-même après la durée choisie."}
            </AppText>
          </View>

          <View style={styles.section}>
            <AppText variant="label" muted>
              Récitateur de cette sourate
            </AppText>
            {recitations.isPending ? (
              <ActivityIndicator color={colors.primary} />
            ) : recitations.isError ? (
              <AppText muted>{errorMessage(recitations.error)}</AppText>
            ) : (
              <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <ReciterRow
                  title="Récitateur par défaut (réglages)"
                  subtitle={defaultReciter ? (defaultReciter.translatedName ?? defaultReciter.reciterName) : undefined}
                  selected={chosen === null}
                  onPress={() => settings.setSurahRecitation(chapterId, null)}
                />
                {groupRecitations(recitations.data ?? []).map((group) => (
                  <View key={group.key}>
                    <RecitationGroupHeader group={group} />
                    {group.recitations.map((r) => (
                      <ReciterRow
                        key={r.id}
                        title={r.translatedName ?? r.reciterName}
                        subtitle={r.style ?? undefined}
                        selected={chosen === r.id}
                        onPress={() => settings.setSurahRecitation(chapterId, r.id)}
                      />
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.row}>
            <AppText variant="label" muted style={styles.flex}>
              Vitesse de récitation
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Vitesse ${formatRate(rate)}, toucher pour changer`}
              onPress={cycleRate}
              style={[styles.rate, { borderColor: colors.primary, backgroundColor: colors.primarySoft }]}>
              <Ionicons name="speedometer-outline" size={16} color={colors.primary} />
              <AppText variant="bodyStrong" color={colors.primary}>
                {formatRate(rate)}
              </AppText>
            </Pressable>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface }]}>
      <AppText variant="bodyStrong" color={selected ? colors.primary : colors.text}>
        {label}
      </AppText>
    </Pressable>
  );
}

function ReciterRow({ title, subtitle, selected, onPress }: { title: string; subtitle?: string; selected: boolean; onPress: () => void }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      onPress={onPress}
      style={({ pressed }) => [styles.reciter, { borderColor: colors.border, opacity: pressed ? 0.6 : 1 }]}>
      <View style={styles.flex}>
        <AppText color={selected ? colors.primary : undefined}>{title}</AppText>
        {subtitle ? (
          <AppText variant="caption" muted>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {selected ? <Ionicons name="checkmark" size={18} color={colors.primary} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "#0006" },
  sheet: { maxHeight: "85%", borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: spacing.lg },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2 },
  content: { gap: spacing.lg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  section: { gap: spacing.sm },
  chips: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chip: { minWidth: 56, alignItems: "center", borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  list: { borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
  reciter: { flexDirection: "row", alignItems: "center", gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth },
  rate: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
