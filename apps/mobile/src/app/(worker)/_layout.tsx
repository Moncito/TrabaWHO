import { Tabs } from "expo-router";
import { Briefcase } from "phosphor-react-native";

import { C } from "@/components/ui";

export default function WorkerTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.subtle,
        tabBarLabelStyle: { fontFamily: "Archivo_700Bold", fontSize: 12 },
      }}
    >
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: ({ color }) => <Briefcase color={String(color)} size={22} weight="bold" /> }} />
      <Tabs.Screen name="job/[id]" options={{ href: null }} />
      <Tabs.Screen name="report" options={{ href: null }} />
    </Tabs>
  );
}
