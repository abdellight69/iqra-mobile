import Ionicons from "@expo/vector-icons/Ionicons";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useReducedMotion } from "@/lib/a11y";
import { formatRate, usePlayback } from "@/lib/playback-store";
import { radius, spacing, useColors } from "@/lib/theme";
import { AppText } from "./AppText";
import { Button } from "./Button";

export type RepeatSettings = { fromVerse: number; toVerse: number; verseRepeat: number; rounds: number };

const VERSE_REPEATS = [1, 2, 3, 5];
const ROUNDS = [1, 3, 5, 10, Infinity];

/** Réglage de la répétition d'un passage : versets de… à…, répétitions, vitesse. */
export function RepeatSheet({
  visible,
  versesCount,
  initial,
  onClose,
  onStart,
}: {
  visible: boolean;
  versesCount: number;
  initial: RepeatSettings;
  onClose: () => void;
  onStart: (settings: RepeatSettings) => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const { rate, cycleRate } = usePlayback();
  const [settings, setSettings] = useState(initial);
  const update = (patch: Partial<RepeatSettings>) => setSettings((s) => ({ ...s, ...patch }));

  return (
    <Modal visible={visible} transparent animationType={reduceMotion ? "fade" : "slide"} onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={[styles.grabber, { backgroundColor: colors.border }]} />
        <AppText variant="title">Répéter un passage</AppText>

        <View style={styles.range}>
          <Stepper
            label="Du verset"
            value={settings.fromVerse}
            min={1}
            max={versesCount}
            onChange={(fromVerse) => update({ fromVerse, toVerse: Math.max(fromVerse, settings.toVerse) })}
          />
          <Stepper
            label="Au verset"
            value={settings.toVerse}
            min={1}
            max={versesCount}
            onChange={(toVerse) => update({ toVerse, fromVerse: Math.min(toVerse, settings.fromVerse) })}
          />
        </View>

        <Choices
          label="Chaque verset"
          options={VERSE_REPEATS}
          value={settings.verseRepeat}
          format={(n) => `×${n}`}
          onChange={(verseRepeat) => update({ verseRepeat })}
        />
        <Choices
          label="Le passage entier"
          options={ROUNDS}
          value={settings.rounds}
          format={(n) => (n === Infinity ? "∞" : `×${n}`)}
          onChange={(rounds) => update({ rounds })}
        />

        <View style={styles.rateRow}>
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

        <Button title="Lancer la répétition" icon="repeat" onPress={() => onStart(settings)} />
      </View>
    </Modal>
  );
}

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const colors = useColors();
  const step = (delta: number) => onChange(Math.min(max, Math.max(min, value + delta)));
  return (
    <View style={[styles.stepper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <AppText variant="label" muted>
        {label}
      </AppText>
      <View style={styles.stepperRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} : moins`} hitSlop={10} onPress={() => step(-1)} disabled={value <= min}>
          <Ionicons name="remove-circle-outline" size={28} color={value <= min ? colors.border : colors.primary} />
        </Pressable>
        <AppText variant="title">{value}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} : plus`} hitSlop={10} onPress={() => step(1)} disabled={value >= max}>
          <Ionicons name="add-circle-outline" size={28} color={value >= max ? colors.border : colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

function Choices({ label, options, value, format, onChange }: { label: string; options: number[]; value: number; format: (n: number) => string; onChange: (n: number) => void }) {
  const colors = useColors();
  return (
    <View style={styles.choices}>
      <AppText variant="label" muted>
        {label}
      </AppText>
      <View style={styles.chips}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={String(option)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option)}
              style={[styles.chip, { borderColor: selected ? colors.primary : colors.border, backgroundColor: selected ? colors.primarySoft : colors.surface }]}>
              <AppText variant="bodyStrong" color={selected ? colors.primary : colors.text}>
                {format(option)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "#0006" },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.lg, gap: spacing.lg },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2 },
  range: { flexDirection: "row", gap: spacing.md },
  stepper: { flex: 1, borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, padding: spacing.md, gap: spacing.xs, alignItems: "center" },
  stepperRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  choices: { gap: spacing.sm },
  chips: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  chip: { minWidth: 56, alignItems: "center", borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  rateRow: { flexDirection: "row", alignItems: "center" },
  rate: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
});
