import { Tabs } from "expo-router";
import { ListBullets, Plus } from "phosphor-react-native";

import { C } from "@/components/ui";

export default function ClientTabs() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.ink,
        tabBarInactiveTintColor: C.subtle,
        tabBarLabelStyle: { fontFamily: "Archivo_700Bold", fontSize: 12 },
      }}
    >
      <Tabs.Screen name="new-problem" options={{ title: "Bago", tabBarIcon: ({ color }) => <Plus color={String(color)} size={22} weight="bold" /> }} />
      <Tabs.Screen name="bookings" options={{ title: "Bookings", tabBarIcon: ({ color }) => <ListBullets color={String(color)} size={22} weight="bold" /> }} />
      <Tabs.Screen name="booking-card" options={{ href: null }} />
      <Tabs.Screen name="booked" options={{ href: null }} />
      <Tabs.Screen name="booking/[ref]" options={{ href: null }} />
    </Tabs>
  );
}
