import { router, Stack, usePathname } from "expo-router";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useOffline } from "@/lib/offline";
import { loadRememberedProfile } from "@/lib/profile-memory";
import { useReminderSync, useReminderTaps } from "@/lib/reminders";
import { fonts, useColors } from "@/lib/theme";
import type { Profiles } from "@/lib/types";

// « Qui lit ? » une fois par lancement de l'app, quand le compte a plusieurs profils et que le
// profil de la session n'est pas celui choisi la dernière fois (mémorisé jusqu'à la déconnexion).
let profilePickerShown = false;

function useProfilePickerOnLaunch() {
  const pathname = usePathname();
  const current = useRef(pathname);
  useEffect(() => {
    current.current = pathname;
  }, [pathname]);
  useEffect(() => {
    if (profilePickerShown) return;
    profilePickerShown = true;
    Promise.all([api<Profiles>("/me/profiles"), loadRememberedProfile()])
      .then(([data, remembered]) => {
        const active = data.profiles.find((p) => p.current);
        if (remembered && active?.id === remembered) return;
        if (data.profiles.length > 1 && !current.current.startsWith("/profiles")) router.push("/profiles");
      })
      // Hors ligne ou serveur plus ancien : on reste sur le profil actuel.
      .catch(() => undefined);
    // Après une déconnexion, la prochaine connexion propose de nouveau le choix.
    return () => {
      if (useAuth.getState().status === "signedOut") profilePickerShown = false;
    };
  }, []);
}

export const unstable_settings = { anchor: "(tabs)" };

export default function AppLayout() {
  const colors = useColors();
  useReminderSync();
  useReminderTaps();
  useProfilePickerOnLaunch();
  useEffect(() => useOffline.getState().load(), []);
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerTitleStyle: {
          fontFamily: fonts.medium,
          fontSize: 16,
          color: colors.text,
        },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.background },
      }}
    >
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
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.7, 1],
          sheetGrabberVisible: false,
          sheetCornerRadius: 24,
          headerShown: false,
        }}
      />
      <Stack.Screen name="learn/[lessonId]" options={{ title: "Fiche" }} />
      <Stack.Screen
        name="learn/session"
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="memorize/new"
        options={{ presentation: "modal", title: "Nouveau plan" }}
      />
      <Stack.Screen
        name="memorize/[planId]"
        options={{ title: "Plan de mémorisation" }}
      />
      <Stack.Screen
        name="memorize/map"
        options={{ title: "Carte de mémorisation" }}
      />
      <Stack.Screen name="memorize/recite" options={{ title: "" }} />
      <Stack.Screen
        name="memorize/session"
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen name="settings" options={{ title: "Réglages" }} />
      <Stack.Screen
        name="profiles/index"
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          animation: "fade",
        }}
      />
      <Stack.Screen
        name="profiles/manage"
        options={{ title: "Profils de la famille" }}
      />
      <Stack.Screen name="bookmarks" options={{ title: "Signets" }} />
      <Stack.Screen name="search" options={{ title: "Rechercher" }} />
      <Stack.Screen name="prayer" options={{ title: "" }} />
      <Stack.Screen name="downloads" options={{ title: "Téléchargements" }} />
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: false,
          gestureEnabled: false,
          animation: "fade",
        }}
      />
      <Stack.Screen name="programs/index" options={{ title: "" }} />
      <Stack.Screen name="programs/[id]" options={{ title: "" }} />
      <Stack.Screen
        name="share/[key]"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen name="reading/index" options={{ title: "" }} />
      <Stack.Screen name="reading/alphabet" options={{ title: "L’alphabet" }} />
      <Stack.Screen
        name="reading/letter/[id]"
        options={{
          presentation: "formSheet",
          sheetAllowedDetents: [0.85, 1],
          sheetGrabberVisible: true,
          sheetCornerRadius: 24,
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="reading/session"
        options={{
          presentation: "fullScreenModal",
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
