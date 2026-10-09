import { router } from "expo-router";
import { CaretRight, Cpu, FirstAidKit, ShieldCheck, type Icon } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";

import { useSession } from "@/data/session";

import { HeaderLink } from "./Screen";
import { Avatar, C } from "./ui";

/** Header actions on tab roots: AI stats (demo proof) and my profile. Tools live in <ToolCards/>. */
export function AccountButtons() {
  const user = useSession();
  return (
    <View className="flex-row items-center gap-2">
      <HeaderLink href="/ai-stats" label="AI on this phone">
        <View className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
          <Cpu size={20} color={C.lime} weight="bold" />
        </View>
      </HeaderLink>
      <HeaderLink href="/profile" label="My profile">
        <Avatar name={user?.name ?? ""} size={40} tone="amber" />
      </HeaderLink>
    </View>
  );
}

/** Two safety tools side by side: first aid while waiting, and the anti-scam message check. */
export function ToolCards() {
  return (
    <View className="flex-row gap-3">
      <Tool icon={FirstAidKit} title="While you wait" hint="Safe first steps" onPress={() => router.push("/first-aid")} />
      <Tool icon={ShieldCheck} title="Check a message" hint="Spot scams" onPress={() => router.push("/scam-check")} />
    </View>
  );
}

function Tool({ icon: I, title, hint, onPress }: { icon: Icon; title: string; hint: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} className="flex-1 gap-2 rounded-3xl border border-border bg-surface p-4 active:opacity-80">
      <View className="flex-row items-center justify-between">
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-info-bg">
          <I size={20} color={C.navy} weight="fill" />
        </View>
        <CaretRight size={16} color={C.subtle} weight="bold" />
      </View>
      <View>
        <Text className="font-body-bold text-[15px] text-ink">{title}</Text>
        <Text className="font-body text-xs text-muted">{hint}</Text>
      </View>
    </Pressable>
  );
}
