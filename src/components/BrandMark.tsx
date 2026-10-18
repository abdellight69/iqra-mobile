import Svg, { Circle, Polygon } from "react-native-svg";

/** Étoile à huit branches (rub el-hizb) au trait, emblème de l'application. */
export function BrandMark({ size = 48, color = "#D4B36E" }: { size?: number; color?: string }) {
  const c = 50;
  const square = (r: number, rotation: number) =>
    Array.from({ length: 4 }, (_, i) => {
      const angle = ((rotation + 45 + 90 * i) * Math.PI) / 180;
      return `${c + r * Math.cos(angle)},${c + r * Math.sin(angle)}`;
    }).join(" ");
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden>
      <Polygon points={square(44, 0)} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      <Polygon points={square(44, 45)} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      <Circle cx={c} cy={c} r={9} fill={color} />
    </Svg>
  );
}
