import Ionicons from "@expo/vector-icons/Ionicons";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/AppText";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { avatarLevelForStars } from "@/lib/kid-avatar";
import { KID_TONES, KIDS, useKidsColors } from "@/lib/kids";
import { radius, spacing, useColors } from "@/lib/theme";

/** Or de l'anneau des niveaux 3 à 5 : le bord du jaune « soleil », plus profond que la couleur franche. */
const GOLD = KID_TONES.sun.edge;

/**
 * Pastille d'un enfant dans son cadre : un anneau qui change avec ses autocollants (bleu, jaune,
 * doré), puis des petites étoiles, puis une couronne, et son niveau en dessous. `compact` : la
 * petite version de l'accueil, sans libellé.
 */
export function KidAvatarFrame({ name, avatar, stars, size = 92, compact = false }: { name: string; avatar: string | null | undefined; stars: number; size?: number; compact?: boolean }) {
  const colors = useColors();
  const kc = useKidsColors();
  const level = avatarLevelForStars(stars);
  const ringWidth = compact ? 3 : 5;
  const outer = size + 8 + ringWidth * 2;
  const ringColor = level.ring === "blue" ? kc.tint("blue").bg : level.ring === "sun" ? KIDS.sun : GOLD;
  const starSize = compact ? 12 : 20;
  // Étoiles réparties sur la moitié haute de l'anneau.
  const angles = level.stars === 5 ? [-150, -120, -90, -60, -30] : level.stars === 3 ? [-130, -90, -50] : [];
  const r = outer / 2;
  return (
    <View style={styles.frame} accessibilityLabel={`${name}, niveau ${level.level}`}>
      <View style={[styles.ring, { width: outer, height: outer, borderRadius: r, borderWidth: ringWidth, borderColor: ringColor, backgroundColor: colors.surface }]}>
        <ProfileAvatar name={name} avatar={avatar} size={size} />
        {angles.map((deg) => {
          const rad = (deg * Math.PI) / 180;
          return (
            <Ionicons
              key={deg}
              name="star"
              size={starSize}
              color={KIDS.sun}
              style={[styles.star, { left: r + r * Math.cos(rad) - starSize / 2 - ringWidth, top: r + r * Math.sin(rad) - starSize / 2 - ringWidth }]}
              aria-hidden
            />
          );
        })}
        {level.crown ? (
          <View style={[styles.crown, { backgroundColor: KIDS.sun, borderColor: colors.surface, top: -(compact ? 10 : 16) - ringWidth }]} aria-hidden>
            <Ionicons name="ribbon" size={compact ? 14 : 22} color={KIDS.sunInk} />
          </View>
        ) : null}
      </View>
      {!compact ? (
        <View style={[styles.label, { backgroundColor: level.ring === "blue" ? kc.tint("blue").bg : kc.sunSoft }]}>
          <AppText variant="caption" color={level.ring === "blue" ? kc.tint("blue").ink : kc.onSunSoft}>
            Niveau {level.level}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { alignItems: "center", gap: spacing.xs },
  ring: { alignItems: "center", justifyContent: "center" },
  star: { position: "absolute" },
  crown: { position: "absolute", alignSelf: "center", borderRadius: radius.pill, borderWidth: 2, paddingHorizontal: 6, paddingVertical: 2 },
  label: { borderRadius: radius.pill, paddingHorizontal: spacing.md, paddingVertical: 2, marginTop: -spacing.xs },
});
