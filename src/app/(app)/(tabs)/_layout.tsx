import { Redirect } from "expo-router";
import { Tabs } from "expo-router/js-tabs";
import { TabBar } from "@/components/TabBar";
import { useMe } from "@/lib/queries";

const TABS = [
  { name: "index", title: "Accueil" },
  { name: "quran", title: "Coran" },
  { name: "memorize", title: "Mémoriser" },
  { name: "learn", title: "Mots" },
  { name: "profile", title: "Profil" },
];

export default function TabsLayout() {
  const me = useMe();
  // Premier lancement : objectif, niveau et rythme avant d'arriver sur l'accueil.
  if (me.data?.onboarded === false) return <Redirect href="/onboarding" />;
  return (
    <Tabs screenOptions={{ headerShown: false }} tabBar={(props) => <TabBar {...props} />}>
      {TABS.map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={{ title: tab.title }} />
      ))}
    </Tabs>
  );
}
