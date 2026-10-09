import "../global.css";

import { Anton_400Regular } from "@expo-google-fonts/anton";
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
  Archivo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/archivo";
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
  const [loaded] = useFonts({
    Anton_400Regular,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
    Archivo_800ExtraBold,
  });
  useSyncTriggers();

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;
  return (
    <View className="flex-1 bg-ink">
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
      <ToastHost />
    </View>
  );
}
