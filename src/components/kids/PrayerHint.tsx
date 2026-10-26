import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { KID_TONES, useKidsColors } from "@/lib/kids";
import { prayerHint } from "@/lib/kids-quran";
import { radius, spacing } from "@/lib/theme";

/**
 * Petit bandeau « lune » : la sourate se dit dans la prière. Rien pour les autres sourates.
 * `compact` : une simple ligne (sous un plan de récitation) ; `text` remplace le mot par défaut.
 */
export function PrayerHint({ chapterId, text, compact = false }: { chapterId: number; text?: string; compact?: boolean }) {
  const kc = useKidsColors();
  const hint = prayerHint(chapterId);
  if (!hint) return null;
  const tint = kc.tint("violet");
  if (compact) {
    return (
      <View style={styles.line}>
        <Ionicons name="moon" size={14} color={KID_TONES.violet.main} />
        <AppText variant="caption" color={tint.ink} style={styles.flex} numberOfLines={2}>
          {text ?? hint}
        </AppText>
      </View>
    );
  }
  return (
    <View style={[styles.band, { backgroundColor: tint.bg }]}>
      <View style={[styles.icon, { backgroundColor: KID_TONES.violet.main }]}>
        <Ionicons name="moon" size={18} color={KID_TONES.violet.onMain} />
      </View>
      <AppText variant="bodyStrong" color={tint.ink} style={styles.flex}>
        {text ?? hint}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  line: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  band: { flexDirection: "row", alignItems: "center", gap: spacing.sm + 2, borderRadius: radius.lg, padding: spacing.sm + 2 },
  icon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
});
