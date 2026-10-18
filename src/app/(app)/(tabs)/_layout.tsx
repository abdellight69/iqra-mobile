import { Tabs } from "expo-router/js-tabs";
import { TabBar } from "@/components/TabBar";

const TABS = [
  { name: "index", title: "Accueil" },
  { name: "quran", title: "Coran" },
  { name: "memorize", title: "Mémoriser" },
  { name: "learn", title: "Mots" },
  { name: "profile", title: "Profil" },
];

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}
