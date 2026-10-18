import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { useSafeAreaInsets, type Edge } from "react-native-safe-area-context";

/**
 * Marges de sécurité (encoche, barre d'état, barre d'accueil) appliquées depuis les
 * dimensions de la fenêtre. À utiliser pour les écrans qui occupent tout l'écran
 * (fullScreenModal, écrans sans en-tête) : sur iOS, le SafeAreaView natif présenté
 * en fullScreenModal peut ne recevoir aucune marge et passer sous la barre d'état.
 */
export function SafeArea({
  edges = ["top", "bottom"],
  style,
  children,
}: {
  edges?: Edge[];
  style?: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  // Comme le SafeAreaView natif : la marge s'ajoute au padding déjà demandé par le style.
  const flat = (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;
  const base = (side: unknown, axis: unknown) =>
    typeof side === "number" ? side : typeof axis === "number" ? axis : typeof flat.padding === "number" ? flat.padding : 0;
  return (
    <View
      style={[
        style,
        {
          paddingTop: base(flat.paddingTop, flat.paddingVertical) + (edges.includes("top") ? insets.top : 0),
          paddingBottom: base(flat.paddingBottom, flat.paddingVertical) + (edges.includes("bottom") ? insets.bottom : 0),
          paddingLeft: base(flat.paddingLeft, flat.paddingHorizontal) + (edges.includes("left") ? insets.left : 0),
          paddingRight: base(flat.paddingRight, flat.paddingHorizontal) + (edges.includes("right") ? insets.right : 0),
        },
      ]}>
      {children}
    </View>
  );
}
