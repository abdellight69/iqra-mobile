import type { StyleProp, ViewStyle } from "react-native";
import { RoundButton, type RoundButtonProps } from "@/components/kids/KidButton";
import { useKidVoice, type VoiceDeps } from "@/lib/kid-voice";

/**
 * Petit bouton rond « Écouter la consigne » des écrans enfant : lit `text` à voix haute quand
 * l'écran s'ouvre (et quand `deps` changent), et le relit d'un doigt. Rien quand un parent a
 * coupé la voix des consignes.
 */
export function KidVoiceButton({
  text,
  deps,
  tone = "blue",
  size = 44,
  style,
}: {
  text: string;
  /** Quand relire d'office (par défaut : à chaque changement du texte). */
  deps?: VoiceDeps;
  tone?: RoundButtonProps["tone"];
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const voice = useKidVoice(text, deps);
  if (!voice.enabled) return null;
  return <RoundButton icon="volume-high" label="Écouter la consigne" tone={tone} size={size} style={style} onPress={voice.replay} />;
}
