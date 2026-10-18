import Svg, { Circle, Polygon } from "react-native-svg";

/** Étoile à huit branches (rub el-hizb), emblème de l'application. */
export function BrandMark({ size = 48, color = "#D4AF37", background = "transparent" }: { size?: number; color?: string; background?: string }) {
  const c = 50;
  const square = (r: number, rotation: number) =>
    Array.from({ length: 4 }, (_, i) => {
      const angle = ((rotation + 45 + 90 * i) * Math.PI) / 180;
      return `${c + r * Math.cos(angle)},${c + r * Math.sin(angle)}`;
    }).join(" ");
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityElementsHidden>
      <Circle cx={c} cy={c} r={50} fill={background} />
      <Polygon points={square(42, 0)} fill={color} />
      <Polygon points={square(42, 45)} fill={color} />
      <Polygon points={square(33, 0)} fill="#0F5F4D" />
      <Polygon points={square(33, 45)} fill="#0F5F4D" />
      <Circle cx={c} cy={c} r={12} fill={color} />
    </Svg>
  );
}
