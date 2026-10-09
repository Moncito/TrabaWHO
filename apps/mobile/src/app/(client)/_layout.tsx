import { Tabs } from "expo-router";
import { ListBullets, Plus, Sparkle } from "phosphor-react-native";

import { PillTabBar } from "@/components/PillTabBar";
import { C } from "@/components/ui";
import { useGuest } from "@/data/session";

export default function ClientTabs() {
  // Guests can't book, so the first tab is "Ask AI" for them (same screen); signed-in clients see "Book".
  const guest = useGuest();
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
      <Tabs.Screen
        name="new-problem"
        options={{
          title: guest ? "Ask AI" : "Book",
          tabBarIcon: ({ color }) =>
            guest ? <Sparkle color={String(color)} size={22} weight="fill" /> : <Plus color={String(color)} size={22} weight="bold" />,
        }}
      />
      <Tabs.Screen name="bookings" options={{ title: "Bookings", tabBarIcon: ({ color }) => <ListBullets color={String(color)} size={22} weight="bold" /> }} />
      <Tabs.Screen name="booking-card" options={{ href: null }} />
      <Tabs.Screen name="booked" options={{ href: null }} />
      <Tabs.Screen name="booking/[ref]" options={{ href: null }} />
    </Tabs>
  );
}
