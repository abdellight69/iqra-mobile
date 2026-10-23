import { router, Stack, usePathname } from "expo-router";
import { AppState } from "react-native";
import { useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-store";
import { useOffline } from "@/lib/offline";
import { takePendingInvite } from "@/lib/pending-invite";
import { loadRememberedProfile } from "@/lib/profile-memory";
import { refreshDailyReserve } from "@/lib/queries";
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

/** Prépare la séance du jour hors ligne, au lancement et à chaque retour au premier plan. */
function useDailyReserve() {
  const translationId = useAuth((s) => s.user?.translationId ?? null);
  useEffect(() => {
    void refreshDailyReserve(translationId);
    const subscription = AppState.addEventListener("change", (state) => state === "active" && void refreshDailyReserve(translationId));
    return () => subscription.remove();
  }, [translationId]);
}

export const unstable_settings = { anchor: "(tabs)" };

export default function AppLayout() {
  const colors = useColors();
  useReminderSync();
  useDailyReserve();
  useReminderTaps();
  useProfilePickerOnLaunch();
  // Invitation ouverte avant la connexion : on reprend là où la personne voulait aller.
  useEffect(() => {
    const invite = takePendingInvite();
    if (invite) router.push({ pathname: "/famille/rejoindre", params: invite });
  }, []);
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
      <Stack.Screen name="learn/theme/[themeId]" options={{ title: "Thème" }} />
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
      <Stack.Screen name="famille/index" options={{ title: "Mes familles" }} />
      <Stack.Screen name="famille/nouvelle" options={{ presentation: "modal", title: "Nouvelle famille" }} />
      <Stack.Screen name="famille/rejoindre" options={{ title: "Rejoindre une famille" }} />
      <Stack.Screen name="famille/[id]/index" options={{ title: "" }} />
      <Stack.Screen name="famille/[id]/objectif" options={{ presentation: "modal", title: "Nouvel objectif" }} />
      <Stack.Screen name="famille/[id]/inviter" options={{ title: "Inviter" }} />
      <Stack.Screen name="famille/[id]/partage" options={{ title: "Ma participation" }} />
      <Stack.Screen name="famille/[id]/membre/[userId]" options={{ title: "" }} />
      <Stack.Screen name="mission/index" options={{ presentation: "fullScreenModal", headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="mission/bravo" options={{ presentation: "fullScreenModal", headerShown: false, gestureEnabled: false, animation: "fade" }} />
      <Stack.Screen name="mes-mots" options={{ title: "Mes mots" }} />
      <Stack.Screen name="album/[themeId]" options={{ title: "" }} />
      <Stack.Screen name="missions/index" options={{ title: "Missions des enfants" }} />
      <Stack.Screen name="missions/new" options={{ presentation: "modal", title: "Nouvelle mission" }} />
      <Stack.Screen name="missions/[id]" options={{ title: "" }} />
      <Stack.Screen name="missions/note" options={{ presentation: "modal", title: "Expliquer le verset" }} />
      <Stack.Screen name="prayer" options={{ title: "" }} />
      <Stack.Screen name="downloads" options={{ title: "Téléchargements" }} />
      <Stack.Screen name="soutien" options={{ title: "Soutien" }} />
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
