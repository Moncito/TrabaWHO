import { Tabs } from "expo-router";
import { Briefcase } from "phosphor-react-native";

import { PillTabBar } from "@/components/PillTabBar";
import { C } from "@/components/ui";

export default function WorkerTabs() {
  return (
    <Tabs
      tabBar={(props) => <PillTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.navy,
        tabBarInactiveTintColor: C.subtle,
        tabBarLabelStyle: { fontFamily: "Roboto_700Bold", fontSize: 12 },
      }}
    >
      <Tabs.Screen name="jobs" options={{ title: "Jobs", tabBarIcon: ({ color }) => <Briefcase color={String(color)} size={22} weight="bold" /> }} />
      <Tabs.Screen name="job/[id]" options={{ href: null }} />
      <Tabs.Screen name="report" options={{ href: null }} />
    </Tabs>
  );
}
