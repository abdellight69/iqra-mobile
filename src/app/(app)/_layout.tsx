import { Stack } from "expo-router";
import { useEffect } from "react";
import { useOffline } from "@/lib/offline";
import { useReminderSync } from "@/lib/reminders";
import { fonts, useColors } from "@/lib/theme";

export const unstable_settings = { anchor: "(tabs)" };

export default function AppLayout() {
  const colors = useColors();
  useReminderSync();
  useEffect(() => useOffline.getState().load(), []);
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: { fontFamily: fonts.medium, fontSize: 16, color: colors.text },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="surah/[id]" options={{ title: "" }} />
      <Stack.Screen
        name="word/[location]"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.6, 1],
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="tafsir/[key]"
        options={{ presentation: "formSheet", sheetAllowedDetents: [0.7, 1], sheetGrabberVisible: false, sheetCornerRadius: 24, headerShown: false }}
      />
      <Stack.Screen name="learn/[lessonId]" options={{ title: "Fiche" }} />
      <Stack.Screen name="learn/session" options={{ presentation: "fullScreenModal", headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="memorize/new" options={{ presentation: "modal", title: "Nouveau plan" }} />
      <Stack.Screen name="memorize/[planId]" options={{ title: "Plan de mémorisation" }} />
      <Stack.Screen name="memorize/map" options={{ title: "Carte de mémorisation" }} />
      <Stack.Screen name="memorize/recite" options={{ title: "" }} />
      <Stack.Screen name="memorize/session" options={{ presentation: "fullScreenModal", headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="settings" options={{ title: "Réglages" }} />
      <Stack.Screen name="bookmarks" options={{ title: "Signets" }} />
      <Stack.Screen name="search" options={{ title: "Rechercher" }} />
      <Stack.Screen name="prayer" options={{ title: "" }} />
      <Stack.Screen name="downloads" options={{ title: "Téléchargements" }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false, animation: "fade" }} />
      <Stack.Screen name="programs/index" options={{ title: "" }} />
      <Stack.Screen name="programs/[id]" options={{ title: "" }} />
      <Stack.Screen name="share/[key]" options={{ presentation: "modal", headerShown: false }} />
      <Stack.Screen name="reading/index" options={{ title: "" }} />
      <Stack.Screen name="reading/alphabet" options={{ title: "L’alphabet" }} />
      <Stack.Screen
        name="reading/letter/[id]"
        options={{ presentation: "formSheet", sheetAllowedDetents: [0.85, 1], sheetGrabberVisible: true, sheetCornerRadius: 24, headerShown: false }}
      />
      <Stack.Screen name="reading/session" options={{ presentation: "fullScreenModal", headerShown: false, gestureEnabled: false }} />
    </Stack>
  );
}
