import { SCAM_DISCLAIMER_TL, type ScamResult } from "@trabawho/shared";
import { CheckCircle, ClipboardText, LockSimple, ShieldCheck, ShieldWarning, Warning, type Icon } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ai } from "@/ai";
import { Screen } from "@/components/Screen";
import { Button, C, Field, Label } from "@/components/ui";

// Tap-to-try examples (the same kinds of messages as the scam eval set).
const EXAMPLES = [
  "Sir pa-send na lang po sa GCash ko yung bayad para di na dumaan sa app",
  "May natanggap po kayong 6-digit code? Pakisabi para ma-confirm ko booking",
  "Papunta na po ako, mga 15 minutes andyan na",
];

/** "Check a message": paste a chat/SMS message; on-device AI + rules flag scam signs. Nothing is sent. */
export default function ScamCheck() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScamResult | null>(null);

  // Pre-process the scam prompt while the user pastes (llama.cpp caches one prompt at a time).
  useEffect(() => void ai.prewarm?.("scam"), []);

  async function check() {
    setBusy(true);
    setResult(null);
    try {
      setResult(await ai.checkScam(text.trim()));
    } finally {
      setBusy(false);
    }
  }

  function edit(t: string) {
    setText(t);
    setResult(null);
  }

  return (
    <Screen
      title="Check a message"
      subtitle="Suriin ang mensahe · stays on your phone"
      back
      footer={<Button label={result ? "Check again" : "Check message"} icon={ShieldCheck} variant="dark" loading={busy} onPress={check} disabled={!text.trim()} />}
    >
      <Field label="Message from a worker or client" multiline placeholder="Paste the chat or SMS here · I-paste dito ang mensahe" value={text} onChangeText={edit} maxLength={1000} />

      {result ? (
        <ResultCard result={result} />
      ) : !text ? (
        <View className="gap-2">
          <Label>Try an example</Label>
          {EXAMPLES.map((e) => (
            <Pressable key={e} onPress={() => edit(e)} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 active:opacity-80">
              <ClipboardText size={18} color={C.navy} weight="bold" />
              <Text className="flex-1 font-body text-[14px] leading-[20px] text-ink">{e}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-start gap-2 pt-1">
        <LockSimple size={14} color={C.subtle} style={{ marginTop: 2 }} />
        <Text className="flex-1 font-body text-xs leading-[17px] text-subtle">{SCAM_DISCLAIMER_TL}</Text>
      </View>
    </Screen>
  );
}

const RISK: Record<ScamResult["risk"], { icon: Icon; title: string; tl: string; box: string; tile: string; tileIcon: string; ink: string; advice: string }> = {
  HIGH: {
    icon: ShieldWarning,
    title: "Likely a scam",
    tl: "Mag-ingat: posibleng scam",
    box: "border-[1.5px] border-danger bg-danger-bg",
    tile: "bg-danger",
    tileIcon: C.white,
    ink: "text-danger-ink",
    advice: "Don't send money or codes. On TrabaWHO you pay cash only after the job. Huwag magpadala ng pera.",
  },
  MEDIUM: {
    icon: Warning,
    title: "Be careful",
    tl: "May kahina-hinala",
    box: "border-[1.5px] border-amber bg-amber-bg",
    tile: "bg-amber",
    tileIcon: C.navy,
    ink: "text-amber-ink",
    advice: "Stop and check the details in the app before you agree. Huminto muna at i-check sa app.",
  },
  LOW: {
    icon: CheckCircle,
    title: "Looks safe",
    tl: "Walang nakitang babala",
    box: "border border-ok-bg bg-ok-bg",
    tile: "bg-success",
    tileIcon: C.white,
    ink: "text-ok",
    advice: "No warning signs. Still, pay only after the job is done. Magbayad pagkatapos ng trabaho.",
  },
};

function ResultCard({ result }: { result: ScamResult }) {
  const r = RISK[result.risk];
  const I = r.icon;
  const n = result.warnings.length;
  return (
    <Animated.View entering={FadeInDown.duration(250)} className={`gap-3 rounded-3xl p-4 ${r.box}`}>
      <View className="flex-row items-center gap-3">
        <View className={`h-12 w-12 items-center justify-center rounded-2xl ${r.tile}`}>
          <I size={26} color={r.tileIcon} weight="fill" />
        </View>
        <View className="flex-1">
          <Text className={`font-headline text-[20px] leading-[24px] ${r.ink}`}>{r.title}</Text>
          <Text className={`font-body text-[13px] ${r.ink}`}>
            {r.tl}
            {n ? ` · ${n} warning sign${n > 1 ? "s" : ""}` : ""}
          </Text>
        </View>
      </View>
      {result.warnings.map((w) => (
        <View key={w.flag} className="gap-1 rounded-2xl bg-surface p-3">
          <Text className="font-body-bold text-[15px] text-ink">{w.title}</Text>
          <Text className="font-body text-[14px] leading-[20px] text-muted">{w.text}</Text>
        </View>
      ))}
      <View className="rounded-2xl bg-surface p-3">
        <Text className="font-body text-[14px] leading-[20px] text-ink">
          <Text className="font-body-bold">What to do: </Text>
          {r.advice}
        </Text>
      </View>
      <Text className={`font-body text-xs ${r.ink}`}>
        {result.source === "model" ? "Checked by the AI on this phone + rules" : "Checked by rules only (AI not loaded)"} · {(result.latencyMs / 1000).toFixed(1)} s
      </Text>
    </Animated.View>
  );
}
