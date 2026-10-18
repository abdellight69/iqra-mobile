import { useMemo, useState } from "react";
import { PanResponder, StyleSheet, View, type GestureResponderEvent, type LayoutChangeEvent } from "react-native";
import Svg, { Path } from "react-native-svg";
import { radius, useColors } from "@/lib/theme";
import { ArabicText } from "./ArabicText";

type Point = { x: number; y: number };

const pointOf = (e: GestureResponderEvent): Point => ({ x: e.nativeEvent.locationX, y: e.nativeEvent.locationY });

const toPath = (points: Point[]) =>
  points.length === 1
    ? `M ${points[0]!.x} ${points[0]!.y} l 0.1 0`
    : points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

/**
 * Ardoise de tracé : la lettre modèle en filigrane, le doigt dessine par-dessus.
 * Exercice libre : le tracé n'est pas corrigé, l'élève compare avec le modèle.
 * Pour effacer, le parent remonte le composant (changement de `key`).
 */
export function TracePad({ glyph, showModel, onDraw }: { glyph: string; showModel: boolean; onDraw: (drawn: boolean) => void }) {
  const colors = useColors();
  const [size, setSize] = useState(0);
  const [strokes, setStrokes] = useState<Point[][]>([]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (e) => {
          const point = pointOf(e);
          setStrokes((all) => [...all, [point]]);
          onDraw(true);
        },
        onPanResponderMove: (e) => {
          const point = pointOf(e);
          setStrokes((all) => (all.length === 0 ? all : [...all.slice(0, -1), [...all.at(-1)!, point]]));
        },
      }),
    [onDraw],
  );

  const height = size || 320;
  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setSize(e.nativeEvent.layout.width)}
      style={[styles.pad, { height, backgroundColor: colors.surface, borderColor: colors.border }]}>
      {showModel ? (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {/* La police Amiri a un grand espace au-dessus des lettres : on remonte le modèle pour le centrer. */}
          <ArabicText
            size={Math.round(height * 0.5)}
            center
            color={colors.textFaint}
            style={{ lineHeight: height, opacity: 0.35, transform: [{ translateY: -height * 0.12 }] }}>
            {glyph}
          </ArabicText>
        </View>
      ) : null}
      <View style={StyleSheet.absoluteFill} {...responder.panHandlers}>
        <Svg width="100%" height="100%" pointerEvents="none">
          {strokes.map((points, i) => (
            <Path key={i} d={toPath(points)} stroke={colors.primary} strokeWidth={10} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { width: "100%", borderRadius: radius.lg, borderWidth: StyleSheet.hairlineWidth, overflow: "hidden" },
});
