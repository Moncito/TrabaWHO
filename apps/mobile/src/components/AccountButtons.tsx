import { router } from "expo-router";
import { Cpu, FirstAidKit, ShieldCheck, UserSwitch } from "phosphor-react-native";
import { Pressable, View } from "react-native";

import { setUser } from "@/data/session";

import { HeaderLink } from "./Screen";
import { C } from "./ui";

/** Header actions on tab roots: first-aid chat, anti-scam check, AI stats (demo proof), switch account. */
export function AccountButtons() {
  return (
    <View className="flex-row">
      <HeaderLink href="/first-aid" label="First-aid habang naghihintay">
        <FirstAidKit size={24} color={C.white} weight="bold" />
      </HeaderLink>
      <HeaderLink href="/scam-check" label="Suriin ang mensahe (anti-scam)">
        <ShieldCheck size={24} color={C.white} weight="bold" />
      </HeaderLink>
      <HeaderLink href="/ai-stats" label="AI stats">
        <Cpu size={24} color={C.lime} weight="bold" />
      </HeaderLink>
      <Pressable
        accessibilityLabel="Palitan ang account"
        className="h-11 w-11 items-center justify-center"
        onPress={() => {
          setUser(null);
          router.replace("/login");
        }}
      >
        <UserSwitch size={24} color={C.white} weight="bold" />
      </Pressable>
    </View>
  );
}
