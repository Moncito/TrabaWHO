import { router } from "expo-router";
import { Cpu, Sparkle } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from "react-native-reanimated";

import { ai, useAiStats } from "@/ai";
import { AccountButtons } from "@/components/AccountButtons";
import { Screen } from "@/components/Screen";
import { Button, C, Card, Field } from "@/components/ui";
import { setDraftCard, setDraftText, useDraft } from "@/state/draft";

/** C02 input + C03 AI thinking. */
export default function NewProblem() {
  const { text } = useDraft();
  const [busy, setBusy] = useState(false);
  const stats = useAiStats();
  // Re-cache the intake prompt while the client types (a worker report may have replaced it).
  useEffect(() => void ai.prewarm?.("intake"), []);

  async function analyze() {
    setBusy(true);
    try {
      setDraftCard(await ai.intake(text.trim()));
      router.push("/booking-card");
    } finally {
      setBusy(false);
    }
  }

  if (busy) {
    return (
      <Screen title="Inaanalyze..." scroll={false}>
        <AIThinking />
      </Screen>
    );
  }

  return (
    <Screen
      title="Ano ang problema?"
      subtitle="Taglish, Filipino o English. Gumagana kahit walang internet."
      right={<AccountButtons />}
      footer={<Button label="Suriin" icon={Sparkle} onPress={analyze} disabled={!text.trim()} />}
    >
      <Field
        label="Ilarawan ang problema"
        multiline
        placeholder="Hal. Ayaw gumana ng saksakan sa kusina, nag-spark kanina"
        value={text}
        onChangeText={setDraftText}
      />
      <Card>
        <View className="flex-row items-center gap-2">
          <Cpu size={18} color={C.limeInk} weight="bold" />
          <Text className="flex-1 font-body text-[13px] text-muted">
            AI sa phone na ito: {stats.modelId}
            {stats.loadState === "loading" ? " (naglo-load...)" : stats.loadState === "failed" ? " (hindi na-load: keyword rules muna)" : ""}
          </Text>
        </View>
      </Card>
    </Screen>
  );
}

const STEPS = ["Binabasa ang problema...", "Pinipili ang serbisyo...", "Tinitingnan ang safety..."];

/** C03 + A1: pulse circle; step lines are cosmetic timers. */
function AIThinking() {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!reduced) scale.value = withRepeat(withSequence(withTiming(1.08, { duration: 600 }), withTiming(1, { duration: 600 })), -1);
    const t1 = setTimeout(() => setStep(1), 1500);
    const t2 = setTimeout(() => setStep(2), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced, scale]);
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <View className="flex-1 items-center justify-center gap-6">
      <Animated.View style={pulse} className="h-28 w-28 items-center justify-center rounded-full bg-lime">
        <Sparkle size={48} color={C.ink} weight="bold" />
      </Animated.View>
      <View className="gap-2">
        {STEPS.map((s, i) => (
          <Text key={s} className={`text-center font-body-semibold text-[15px] ${i <= step ? "text-ink" : "text-border-strong"}`}>
            {s}
          </Text>
        ))}
      </View>
      <Text className="text-center font-body text-xs text-subtle">Tumatakbo ang AI sa phone. Walang data na lumalabas.</Text>
    </View>
  );
}
