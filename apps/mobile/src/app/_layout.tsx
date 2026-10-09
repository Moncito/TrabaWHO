import "../global.css";

// Per-weight imports: the package root would bundle all 18 Roboto files.
import { Roboto_400Regular } from "@expo-google-fonts/roboto/400Regular";
import { Roboto_700Bold } from "@expo-google-fonts/roboto/700Bold";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { View } from "react-native";

import { ai } from "@/ai";
import { ToastHost } from "@/components/Screen";
import { useSyncTriggers } from "@/data/sync";

SplashScreen.preventAutoHideAsync();
// Load + warm up the model in the background at launch (first call is ~10–20 s otherwise).
ai.init().catch(() => undefined);

export default function RootLayout() {
  // Roboto Bold for titles, Roboto Regular for body (artboard v3).
  const [loaded] = useFonts({ Roboto_400Regular, Roboto_700Bold });
  useSyncTriggers();

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;
  return (
    <View className="flex-1 bg-navy">
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
    </View>
  );
}
