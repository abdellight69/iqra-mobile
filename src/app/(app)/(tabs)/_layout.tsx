import Ionicons from "@expo/vector-icons/Ionicons";
import { Tabs } from "expo-router/js-tabs";
import type { ComponentProps } from "react";
import { fonts, useColors } from "@/lib/theme";

type IconName = ComponentProps<typeof Ionicons>["name"];

const TABS: { name: string; title: string; icon: IconName; activeIcon: IconName }[] = [
  { name: "index", title: "Accueil", icon: "home-outline", activeIcon: "home" },
  { name: "quran", title: "Coran", icon: "book-outline", activeIcon: "book" },
  { name: "memorize", title: "Mémoriser", icon: "repeat-outline", activeIcon: "repeat" },
  { name: "learn", title: "Vocabulaire", icon: "school-outline", activeIcon: "school" },
  { name: "profile", title: "Profil", icon: "person-circle-outline", activeIcon: "person-circle" },
];

export default function TabsLayout() {
  const colors = useColors();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ color, focused, size }) => <Ionicons name={focused ? tab.activeIcon : tab.icon} size={size} color={String(color)} />,
          }}
        />
      ))}
    </Tabs>
  );
}
