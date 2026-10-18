import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { BrandMark } from "@/components/BrandMark";
import { Button } from "@/components/Button";
import { spacing } from "@/lib/theme";

const FEATURES = [
  { title: "Lire", text: "Verset par verset, avec la traduction et la récitation" },
  { title: "Comprendre", text: "Chaque mot : phonétique, sens et grammaire" },
  { title: "Mémoriser", text: "Par verset ou par sourate, avec des révisions espacées" },
  { title: "Apprendre", text: "Les mots les plus fréquents du Coran" },
];

const INK = "#0B3B33";
const PAPER = "#F5EFE3";
const GOLD = "#D4B36E";

export default function Welcome() {
  return (
    <View style={[styles.flex, { backgroundColor: INK }]}>
      <SafeAreaView style={styles.container}>
        <View style={styles.hero}>
          <BrandMark size={44} color={GOLD} />
          <View style={styles.titleBlock}>
            <ArabicText size={46} color={GOLD} style={styles.arabic}>
              اقْرَأْ
            </ArabicText>
            <AppText style={styles.wordmark} color={PAPER}>
              Iqra
            </AppText>
            <AppText variant="serifBody" italic color="#F5EFE3B3">
              Comprendre, réciter et mémoriser le Coran.
            </AppText>
          </View>
        </View>

        <View style={styles.features}>
          {FEATURES.map((feature, i) => (
            <View key={feature.title} style={[styles.feature, i > 0 && styles.featureBorder]}>
              <AppText variant="label" color={GOLD} style={styles.featureTitle}>
                {feature.title}
              </AppText>
              <AppText color="#F5EFE3CC" style={styles.flex}>
                {feature.text}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button title="Commencer" variant="light" onPress={() => router.push("/register")} />
          <Button title="J'ai déjà un compte" variant="onDark" onPress={() => router.push("/login")} />
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, justifyContent: "space-between" },
  hero: { marginTop: spacing.xxxl, gap: spacing.xl },
  titleBlock: { gap: spacing.xs },
  arabic: { textAlign: "left", lineHeight: 80 },
  wordmark: { fontFamily: "InstrumentSerif_400Regular", fontSize: 76, lineHeight: 78, letterSpacing: -1.5 },
  features: { gap: 0 },
  feature: { flexDirection: "row", gap: spacing.lg, paddingVertical: spacing.md, alignItems: "baseline" },
  featureBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#F5EFE326" },
  featureTitle: { width: 96 },
  actions: { gap: spacing.sm },
});
