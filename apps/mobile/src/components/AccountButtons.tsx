import { Cpu, FirstAidKit, ShieldCheck, UserCircle } from "phosphor-react-native";
import { View } from "react-native";

import { HeaderLink } from "./Screen";
import { C } from "./ui";

/** Header actions on tab roots: first-aid chat, anti-scam check, AI stats (demo proof), my profile (edit, log out). */
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
      <HeaderLink href="/profile" label="Aking profile">
        <UserCircle size={24} color={C.white} weight="bold" />
      </HeaderLink>
    </View>
  );
}
