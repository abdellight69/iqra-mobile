import { StyleSheet, View } from "react-native";
import { avatarColor } from "@/lib/profiles";
import { useColors } from "@/lib/theme";
import { AppText } from "./AppText";

/** Pastille d'un profil : initiale sur sa couleur, cerclée quand il est sélectionné. */
export function ProfileAvatar({
  name,
  avatar,
  size = 48,
  selected = false,
}: {
  name: string;
  avatar: string | null | undefined;
  size?: number;
  selected?: boolean;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.ring,
        {
          width: size + 8,
          height: size + 8,
          borderRadius: (size + 8) / 2,
          borderColor: selected ? colors.accent : "transparent",
        },
      ]}
    >
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: avatarColor(avatar),
          },
        ]}
      >
        <AppText
          style={{ fontSize: size * 0.42, lineHeight: size * 0.56 }}
          color="#FFFFFF"
        >
          {name.trim().slice(0, 1).toUpperCase() || "?"}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: { borderWidth: 3, alignItems: "center", justifyContent: "center" },
  circle: { alignItems: "center", justifyContent: "center" },
});
