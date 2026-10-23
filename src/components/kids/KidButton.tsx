import Ionicons from "@expo/vector-icons/Ionicons";
import type { ComponentProps } from "react";
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { AppText } from "@/components/AppText";
import { KID_TONES, type KidTone, useKidsColors } from "@/lib/kids";
import { spacing, useColors } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];
type Tone = KidTone | "white";

/** Épaisseur du bord : le bouton « s'enfonce » dessus quand on appuie. */
const EDGE = 5;

function useToneColors(tone: Tone) {
  const colors = useColors();
  const kc = useKidsColors();
  if (tone === "white") return { bg: colors.surface, edge: kc.edge, ink: colors.text };
  const t = KID_TONES[tone];
  return { bg: t.main, edge: t.edge, ink: t.onMain };
}

export type BigButtonProps = {
  title: string;
  icon?: IconName;
  onPress: () => void;
  disabled?: boolean;
  /** Vert par défaut (action principale) ; jaune pour « bravo », blanc pour les actions secondaires. */
  tone?: Tone;
  size?: "lg" | "md";
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/**
 * Grand bouton « tactile » des écrans enfant : une couleur franche posée sur son bord plus
 * sombre, qui s'enfonce à l'appui. Le bord est une vue derrière le bouton, pour que la
 * hauteur totale ne bouge pas quand il descend.
 */
export function BigButton({ title, icon, onPress, disabled, tone = "green", size = "lg", style, accessibilityLabel }: BigButtonProps) {
  const c = useToneColors(tone);
  return (
    <View style={[styles.outer, { backgroundColor: c.edge, opacity: disabled ? 0.5 : 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.inner, size === "md" && styles.innerMd, { backgroundColor: c.bg, transform: [{ translateY: pressed ? EDGE - 1 : 0 }] }]}>
        {icon ? <Ionicons name={icon} size={size === "md" ? 20 : 24} color={c.ink} /> : null}
        <AppText variant={size === "md" ? "bodyStrong" : "headline"} color={c.ink} numberOfLines={1}>
          {title}
        </AppText>
      </Pressable>
    </View>
  );
}

export type RoundButtonProps = {
  icon: IconName;
  /** Lu par le lecteur d'écran : le bouton n'a pas de texte. */
  label: string;
  onPress: () => void;
  tone?: Tone;
  size?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Bouton rond « tactile » : retour, écouter, réécouter… */
export function RoundButton({ icon, label, onPress, tone = "white", size = 48, disabled, style }: RoundButtonProps) {
  const c = useToneColors(tone);
  const edge = size >= 88 ? EDGE + 2 : EDGE - 1;
  return (
    <View style={[styles.roundOuter, { width: size, height: size + edge, borderRadius: size / 2, backgroundColor: c.edge, opacity: disabled ? 0.5 : 1 }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [styles.roundInner, { width: size, height: size, borderRadius: size / 2, backgroundColor: c.bg, transform: [{ translateY: pressed ? edge - 1 : 0 }] }]}>
        <Ionicons name={icon} size={Math.round(size * 0.46)} color={c.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: { borderRadius: 20 },
  inner: {
    minHeight: 60,
    marginBottom: EDGE,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm + 2,
    paddingHorizontal: spacing.xl,
  },
  innerMd: { minHeight: 48, paddingHorizontal: spacing.lg },
  roundOuter: { alignItems: "center" },
  roundInner: { alignItems: "center", justifyContent: "center" },
});
