import { BottomTabBarHeightContext } from "expo-router/js-tabs";
import { useContext, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, RefreshControl, ScrollView, StyleSheet, View, type ViewStyle } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { spacing, useColors } from "@/lib/theme";

export type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: ViewStyle;
  keyboard?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function Screen({ children, scroll = true, edges = ["top"], contentStyle, keyboard, refreshing, onRefresh }: ScreenProps) {
  const colors = useColors();
  // Dans un onglet, la barre flottante recouvre le bas de l'écran : on garde sa hauteur en marge.
  const tabBarHeight = useContext(BottomTabBarHeightContext) ?? 0;
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xxxl + tabBarHeight }, contentStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      refreshControl={onRefresh ? <RefreshControl refreshing={Boolean(refreshing)} onRefresh={onRefresh} tintColor={colors.primary} /> : undefined}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.flex, contentStyle]}>{children}</View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.flex, { backgroundColor: colors.background }]}>
      {keyboard ? (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: spacing.xl - 4, paddingTop: spacing.lg, gap: spacing.xl, paddingBottom: spacing.xxxl },
});
