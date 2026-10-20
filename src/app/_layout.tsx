import { AmiriQuran_400Regular } from "@expo-google-fonts/amiri-quran";
import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold, useFonts } from "@expo-google-fonts/inter";
import { Fraunces_400Regular_Italic, Fraunces_500Medium, Fraunces_600SemiBold } from "@expo-google-fonts/fraunces";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAudioModeAsync } from "expo-audio";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { AppState, Platform, useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ApiError } from "@/lib/api";
import { PLAYBACK_MODE } from "@/lib/audio";
import { useAuth } from "@/lib/auth-store";
import { clearOutbox, flushReviews } from "@/lib/outbox";
import { clearQueryCache, persistQueryCache, restoreQueryCache } from "@/lib/query-persistence";
import { publishWidgetSnapshot } from "@/lib/widget";
import "@/lib/appearance-store";
import { darkColors, lightColors } from "@/lib/theme";

void SplashScreen.preventAutoHideAsync();

// Retour au premier plan : les requêtes périmées sont relancées (statistiques du jour, révisions dues…).
if (Platform.OS !== "web") {
  AppState.addEventListener("change", (state) => focusManager.setFocused(state === "active"));
}

function createQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Pas de nouvelle tentative sur les erreurs « métier » (4xx).
        retry: (count, error) => !(error instanceof ApiError && error.status >= 400 && error.status < 500) && count < 2,
      },
    },
  });
  restoreQueryCache(client);
  return client;
}

export default function RootLayout() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? darkColors : lightColors;
  const [queryClient] = useState(createQueryClient);
  const status = useAuth((s) => s.status);
  const bootstrap = useAuth((s) => s.bootstrap);
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    AmiriQuran_400Regular,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
    Fraunces_400Regular_Italic,
  });

  useEffect(() => {
    void bootstrap();
    // La récitation continue écran verrouillé et en mode silencieux, et s'affiche sur l'écran verrouillé.
    void setAudioModeAsync(PLAYBACK_MODE).catch(() => undefined);
  }, [bootstrap]);

  useEffect(() => persistQueryCache(queryClient), [queryClient]);

  // À la déconnexion, on vide le cache pour ne rien laisser du compte précédent.
  useEffect(() => {
    if (status !== "signedOut") return;
    queryClient.clear();
    clearQueryCache();
    clearOutbox();
    void publishWidgetSnapshot(null);
  }, [status, queryClient]);

  // Connecté, au démarrage et à chaque retour au premier plan : envoi des évaluations faites hors ligne.
  useEffect(() => {
    if (status !== "signedIn") return;
    const flush = () =>
      void flushReviews().then((sent) => {
        if (sent > 0) void queryClient.invalidateQueries();
      });
    flush();
    const subscription = AppState.addEventListener("change", (state) => state === "active" && flush());
    return () => subscription.remove();
  }, [status, queryClient]);

  const ready = (fontsLoaded || fontError) && status !== "loading";
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;

  const navigationTheme = scheme === "dark" ? DarkTheme : DefaultTheme;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          value={{
            ...navigationTheme,
            colors: { ...navigationTheme.colors, background: colors.background, card: colors.surface, primary: colors.primary, text: colors.text, border: colors.border },
          }}>
          <StatusBar style={scheme === "dark" ? "light" : "dark"} />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Protected guard={status === "signedIn"}>
              <Stack.Screen name="(app)" />
            </Stack.Protected>
            <Stack.Protected guard={status === "signedOut"}>
              <Stack.Screen name="(auth)" />
            </Stack.Protected>
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
