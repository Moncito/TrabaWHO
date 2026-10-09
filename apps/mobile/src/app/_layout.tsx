import "../global.css";

import { Anton_400Regular } from "@expo-google-fonts/anton";
import { Archivo_400Regular, Archivo_500Medium, Archivo_700Bold, useFonts } from "@expo-google-fonts/archivo";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({ Anton_400Regular, Archivo_400Regular, Archivo_500Medium, Archivo_700Bold });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;
  return <Stack screenOptions={{ headerShown: false }} />;
}
