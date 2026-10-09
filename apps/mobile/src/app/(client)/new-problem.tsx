import { router } from "expo-router";
import { ChatCircleText, Check, Cpu, Sparkle, WifiSlash } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ai, useAiStats } from "@/ai";
import { AccountButtons } from "@/components/AccountButtons";
import { Screen } from "@/components/Screen";
import { Button, C, Field, Label } from "@/components/ui";
import { useNetwork } from "@/data/sync";
import { setDraftCard, setDraftText, useDraft } from "@/state/draft";

// Tap-to-try demo phrases.
const EXAMPLES = ["May tulo sa ilalim ng lababo namin", "Nag-spark yung saksakan nung sinaksak ko yung charger"];

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

  if (busy) return <AIThinking />;

  return (
    <Screen
      title="What needs fixing?"
      subtitle="Ano ang problema? Taglish, Filipino or English. Works offline."
      right={<AccountButtons />}
      footer={<Button label="Check my problem" icon={Sparkle} onPress={analyze} disabled={!text.trim()} />}
    >
      <Field
        label="Describe the problem"
        multiline
        placeholder="e.g. The kitchen outlet sparked and stopped working"
        value={text}
        onChangeText={setDraftText}
      />
      {!text.trim() ? (
        <View className="gap-2">
          <Label>Try an example</Label>
          {EXAMPLES.map((e) => (
            <Pressable key={e} onPress={() => setDraftText(e)} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 active:opacity-80">
              <ChatCircleText size={18} color={C.navy} weight="bold" />
              <Text className="flex-1 font-body text-[14px] leading-[20px] text-ink">{e}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      <View className="flex-row items-center gap-3 rounded-3xl bg-navy px-4 py-3">
        <View className="h-9 w-9 items-center justify-center rounded-full bg-lime">
          <Cpu size={18} color={C.navy} weight="fill" />
        </View>
        <View className="flex-1">
          <Text className="font-body-bold text-[14px] text-white">AI runs on this phone</Text>
          <Text className="font-body text-xs text-haze">
            {stats.loadState === "loading" ? "Loading the model…" : stats.loadState === "failed" ? "Using keyword rules for now" : "No internet needed · walang data na gagamitin"}
          </Text>
        </View>
      </View>
    </Screen>
  );
}

const STEPS = ["Understanding your problem", "Finding the right service", "Safety check and price"];

/** C03 + A1 (artboard v3 "AI checking"): full navy screen, amber orb with expanding rings; step lines are cosmetic timers. */
function AIThinking() {
  const reduced = useReducedMotion();
  const { online } = useNetwork();
  const scale = useSharedValue(1);
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (!reduced) scale.value = withRepeat(withSequence(withTiming(1.06, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
    const t1 = setTimeout(() => setStep(1), 1500);
    const t2 = setTimeout(() => setStep(2), 4000);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [reduced, scale]);
  const pulse = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-navy-deep">
      <View className="flex-row justify-end px-5 pt-2">
        {!online ? (
          <View className="flex-row items-center gap-1 rounded-full bg-white/15 px-3 py-1">
            <WifiSlash size={14} color={C.white} weight="bold" />
            <Text className="font-body-bold text-[11px] uppercase tracking-wide text-white">Offline OK</Text>
          </View>
        ) : null}
      </View>
      <View className="items-center pt-10">
        <View className="h-[210px] w-[210px] items-center justify-center">
          {reduced ? null : [0, 800, 1600].map((d) => <Ring key={d} delay={d} />)}
          <Animated.View style={[pulse, { elevation: 12, shadowColor: C.lime, shadowOpacity: 0.6, shadowRadius: 30 }]} className="h-[116px] w-[116px] items-center justify-center rounded-full bg-lime">
            <Sparkle size={54} color={C.navy} weight="fill" />
          </Animated.View>
        </View>
      </View>
      <View className="gap-2 px-6 pt-8">
        <Text className="font-headline text-[28px] leading-[32px] text-white">Reading your problem…</Text>
        <Text className="font-body text-[15px] leading-[22px] text-haze">Sinusuri ang problema. The AI runs on this phone, so no data is used.</Text>
      </View>
      <View className="gap-[14px] px-6 pt-6">
        {STEPS.map((s, i) => (
          <View key={s} className="flex-row items-center gap-3">
            {i < step ? (
              <View className="h-7 w-7 items-center justify-center rounded-full bg-lime">
                <Check size={14} color={C.navy} weight="bold" />
              </View>
            ) : i === step ? (
              <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-lime">
                <ActivityIndicator size="small" color={C.lime} />
              </View>
            ) : (
              <View className="h-7 w-7 rounded-full border-2 border-white/25" />
            )}
            <Text className={`text-[15px] ${i === step ? "font-body-bold text-white" : i < step ? "font-body text-white" : "font-body text-haze"}`}>{s}</Text>
          </View>
        ))}
      </View>
      <View className="mx-5 mb-4 mt-auto flex-row items-center gap-3 rounded-[20px] border border-white/15 bg-white/5 px-4 py-[14px]">
        <Cpu size={22} color={C.lime} weight="bold" />
        <Text className="flex-1 font-body text-sm text-blue-100">Runs on your phone. Usually 5 to 15 seconds.</Text>
      </View>
    </SafeAreaView>
  );
}

/** One expanding amber ring around the orb (A1 motion). */
function Ring({ delay }: { delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }), -1));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.9 * (1 - t.value), transform: [{ scale: 0.6 + t.value }] }));
  return <Animated.View style={style} className="absolute h-[210px] w-[210px] rounded-full border-2 border-lime" />;
}
