import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppText } from "@/components/AppText";
import { ArabicText } from "@/components/ArabicText";
import { Button } from "@/components/Button";
import { BrandMark } from "@/components/BrandMark";
import { spacing } from "@/lib/theme";

const FEATURES = [
  "Lire le Coran verset par verset, avec la traduction",
  "Toucher chaque mot : phonétique, sens et grammaire",
  "Mémoriser par verset ou par sourate, avec révisions espacées",
  "Apprendre les mots les plus fréquents du Coran",
];

export default function Welcome() {
  return (
    <LinearGradient colors={["#0A3D32", "#0F5F4D", "#1F8A6E"]} style={styles.flex}>
      <SafeAreaView style={styles.container}>
        <View style={styles.hero}>
          <BrandMark size={84} />
          <ArabicText size="xl" color="#F7EDCC" center>
            اقْرَأْ
          </ArabicText>
          <AppText variant="display" color="#FFFFFF" center>
            Iqra
          </AppText>
          <AppText color="#DCEFE8" center>
            Comprendre, réciter et mémoriser le Coran.
          </AppText>
        </View>

        <View style={styles.features}>
          {FEATURES.map((feature) => (
            <View key={feature} style={styles.feature}>
              <View style={styles.dot} />
              <AppText color="#F2EFE9" style={styles.flex}>
                {feature}
              </AppText>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Button title="Créer un compte" onPress={() => router.push("/register")} style={{ backgroundColor: "#D4AF37", borderColor: "#D4AF37" }} />
          <Button title="J'ai déjà un compte" variant="onDark" onPress={() => router.push("/login")} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, padding: spacing.xl, justifyContent: "space-between" },
  hero: { alignItems: "center", gap: spacing.sm, marginTop: spacing.xxl },
  features: { gap: spacing.md },
  feature: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#D4AF37" },
  actions: { gap: spacing.sm },
});
