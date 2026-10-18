import { StyleSheet, View } from "react-native";
import { radius, useColors } from "@/lib/theme";

export function ProgressBar({ value, color, track, height = 6 }: { value: number; color?: string; track?: string; height?: number }) {
  const colors = useColors();
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      style={[styles.track, { height, backgroundColor: track ?? colors.surfaceMuted }]}>
      <View style={[styles.fill, { width: `${clamped * 100}%`, backgroundColor: color ?? colors.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: radius.pill, overflow: "hidden", width: "100%" },
  fill: { height: "100%", borderRadius: radius.pill },
});
