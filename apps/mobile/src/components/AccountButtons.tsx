import { router } from "expo-router";
import { Cpu, UserSwitch } from "phosphor-react-native";
import { Pressable, View } from "react-native";

import { setUser } from "@/data/session";

import { HeaderLink } from "./Screen";
import { C } from "./ui";

/** Header actions on tab roots: AI stats (demo proof) + "Palitan ang account". */
export function AccountButtons() {
  return (
    <View className="flex-row">
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
