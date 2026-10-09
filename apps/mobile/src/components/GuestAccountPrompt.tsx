import NetInfo from "@react-native-community/netinfo";
import { router } from "expo-router";
import { SignIn, UserPlus, WifiSlash, type Icon } from "phosphor-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { Button, C } from "./ui";

/**
 * Shown to guests where an account is needed (bookings). Log in / sign up need internet:
 * when offline, the buttons explain that instead of opening a form that can't submit.
 */
export function GuestAccountPrompt({
  icon: I,
  title,
  body,
}: {
  icon: Icon;
  title: string;
  body: string;
}) {
  const [offlineMsg, setOfflineMsg] = useState(false);

  async function go(path: "/login" | "/signup") {
    const net = await NetInfo.fetch();
    if (net.isConnected === false) {
      setOfflineMsg(true);
      return;
    }
    setOfflineMsg(false);
    router.push(path);
  }

  return (
    <View className="gap-4 rounded-3xl border border-border bg-surface p-5">
      <View className="h-12 w-12 items-center justify-center rounded-2xl bg-info-bg">
        <I size={24} color={C.navy} weight="fill" />
      </View>
      <View className="gap-1">
        <Text className="font-body-bold text-[17px] text-ink">{title}</Text>
        <Text className="font-body text-[14px] leading-[20px] text-muted">{body}</Text>
      </View>
      {offlineMsg ? (
        <Animated.View entering={FadeIn.duration(200)} className="flex-row items-start gap-2 rounded-2xl bg-amber-bg p-3">
          <WifiSlash size={18} color={C.amberInk} weight="bold" style={{ marginTop: 1 }} />
          <Text className="flex-1 font-body-bold text-[14px] leading-[20px] text-amber-ink">
            Connect to the internet first to log in or sign up. Kumonekta muna sa internet.
          </Text>
        </Animated.View>
      ) : null}
      <Button label="Sign up · Mag-sign up" icon={UserPlus} onPress={() => void go("/signup")} />
      <Button label="Log in" icon={SignIn} variant="ghost" onPress={() => void go("/login")} />
    </View>
  );
}
