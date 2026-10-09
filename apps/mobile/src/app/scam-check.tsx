import { SCAM_DISCLAIMER_TL, type ScamResult } from "@trabawho/shared";
import { CheckCircle, LockSimple, ShieldCheck, ShieldWarning, Warning } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ai } from "@/ai";
import { Screen } from "@/components/Screen";
import { Button, C, Card, Field, Label } from "@/components/ui";

const EXAMPLE = "GCash mo na lang ako directly, cancel mo na yung booking";

/** "Suriin ang mensahe": paste a chat/SMS message; on-device AI + rules flag scam signs. Nothing is sent. */
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

  return (
    <Screen
      title="Suriin ang mensahe"
      subtitle="Anti-scam check. Hindi lumalabas ng phone ang mensahe."
      back
      footer={<Button label="Suriin" icon={ShieldCheck} loading={busy} onPress={check} disabled={!text.trim()} />}
    >
      <Field
        label="I-paste ang mensahe galing sa worker o client"
        multiline
        placeholder={`Hal. "${EXAMPLE}"`}
        value={text}
        onChangeText={(t) => {
          setText(t);
          setResult(null);
        }}
      />
      {result ? <ResultCard result={result} /> : null}
      <View className="flex-row items-center gap-2">
        <LockSimple size={14} color={C.subtle} />
        <Text className="flex-1 font-body text-xs text-subtle">{SCAM_DISCLAIMER_TL}</Text>
      </View>
    </Screen>
  );
}

function ResultCard({ result }: { result: ScamResult }) {
  const high = result.risk === "HIGH";
  const medium = result.risk === "MEDIUM";
  const Icon = high ? ShieldWarning : medium ? Warning : CheckCircle;
  const title = high ? "Mag-ingat: posibleng scam" : medium ? "May kahina-hinala" : "Walang nakitang babala";
  const advice = high
    ? "Huwag magbayad o magbigay ng code. Sa TrabaWho, cash lang pagkatapos ng trabaho. I-report sa app kung may duda."
    : medium
      ? "Huminto muna at i-check ang detalye sa app bago pumayag."
      : "Mukhang normal ang mensahe. Magbayad pa rin lang pagkatapos ng trabaho.";

  return (
    <Animated.View entering={FadeInDown.duration(250)}>
      <Card tone={high ? "danger" : "default"} className={medium ? "border-2 border-amber bg-amber-bg" : ""}>
        <View className="flex-row items-center gap-2">
          <Icon size={28} color={high ? C.danger : medium ? C.amberInk : C.ok} weight="fill" />
          <Text className={`flex-1 font-body-bold text-[17px] ${high ? "text-danger-ink" : medium ? "text-amber-ink" : "text-ink"}`}>{title}</Text>
        </View>
        {result.warnings.map((w) => (
          <View key={w.flag} className="gap-1 rounded-xl bg-surface p-3">
            <Text className="font-body-bold text-[15px] text-ink">{w.title}</Text>
            <Text className="font-body text-[14px] leading-[20px] text-ink">{w.text}</Text>
          </View>
        ))}
        <Text className="font-body-semibold text-[14px] text-ink">{advice}</Text>
        <Label>
          {result.source === "model" ? "AI sa phone + rules" : "Rules lang (hindi na-load ang AI)"} · {(result.latencyMs / 1000).toFixed(1)} s
        </Label>
      </Card>
    </Animated.View>
  );
}
