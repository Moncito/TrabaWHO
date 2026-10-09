import { router } from "expo-router";
import { checkProblemText, MAX_INPUT_CHARS, type ServiceCode } from "@trabawho/shared";
import { Check, Cpu, MapPin, Sparkle, WarningCircle, WifiSlash } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ai, useAiStats } from "@/ai";
import { ToolCards } from "@/components/AccountButtons";
import { HeaderLink, OfflineBanner } from "@/components/Screen";
import { Avatar, C, Label, SERVICE_ICON } from "@/components/ui";
import { useSession } from "@/data/session";
import { useNetwork } from "@/data/sync";
import { setDraftCard, setDraftText, useDraft } from "@/state/draft";

/** C02 input + C03 AI thinking. */
export default function NewProblem() {
  const { text } = useDraft();
  const [busy, setBusy] = useState(false);
  // Plain-code check before the AI: keyboard mashing or a word or two never reaches the model.
  const [problem, setProblem] = useState<string | null>(null);
  const stats = useAiStats();
  const user = useSession();
  const input = useRef<TextInput>(null);
  // Re-cache the intake prompt while the client types (a worker report may have replaced it).
  useEffect(() => void ai.prewarm?.("intake"), []);

  async function analyze() {
    const check = checkProblemText(text);
    if (!check.ok) return setProblem(check.message);
    setBusy(true);
    try {
      setDraftCard(await ai.intake(text.trim()));
      router.push("/booking-card");
    } finally {
      setBusy(false);
    }
  }

  if (busy) return <AIThinking />;

  const first = user?.name.split(" ")[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Magandang umaga" : hour < 18 ? "Magandang hapon" : "Magandang gabi";
  const ready = !!text.trim();

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-soft">
      <View className="flex-row items-center justify-between px-5 pt-2">
        <View className="h-11 flex-row items-center gap-2 rounded-full border border-border bg-surface px-4">
          <MapPin size={16} color={C.lime} weight="fill" />
          <Text className="font-body-bold text-[13px] text-ink" numberOfLines={1}>
            {user ? `${user.barangay}, ${user.city}` : "Your area"}
          </Text>
        </View>
        <View className="flex-row items-center gap-2">
          <HeaderLink href="/ai-stats" label="AI on this phone">
            <View className="h-11 w-11 items-center justify-center rounded-full border border-border bg-surface">
              <Cpu size={20} color={C.navy} weight="bold" />
            </View>
          </HeaderLink>
          <HeaderLink href="/profile" label="My profile">
            <Avatar name={user?.name ?? ""} size={44} />
          </HeaderLink>
        </View>
      </View>
      <View className="gap-1 px-5 pb-3 pt-4">
        <Text className="font-body text-[15px] text-muted">{first ? `${greeting}, ${first}` : greeting}</Text>
        <Text className="font-headline text-[30px] leading-[36px] text-ink">
          What needs <Text style={{ color: C.navy, backgroundColor: "#FEF3C7" }}> fixing </Text> today?
        </Text>
      </View>
      <OfflineBanner />

      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="gap-[14px] px-5 pb-6 pt-2">
          <View className="gap-2 rounded-3xl border border-border bg-surface p-4" style={{ elevation: 3, shadowColor: C.navy, shadowOpacity: 0.08, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } }}>
            <Label>Describe the problem</Label>
            <TextInput
              ref={input}
              value={text}
              onChangeText={(t) => {
                setDraftText(t);
                setProblem(null);
              }}
              maxLength={MAX_INPUT_CHARS}
              multiline
              placeholder="e.g. Ayaw lumamig ng aircon, may tumutulo sa ilalim…"
              placeholderTextColor={C.subtle}
              textAlignVertical="top"
              className="h-[104px] rounded-[18px] border border-border bg-soft px-4 py-3 font-body text-base text-ink focus:border-navy"
            />
            {problem ? (
              <View accessibilityLiveRegion="polite" className="flex-row items-start gap-2 rounded-2xl bg-amber-bg px-3 py-[10px]">
                <WarningCircle size={18} color={C.amberInk} weight="fill" />
                <Text className="flex-1 font-body-bold text-[13px] leading-[18px] text-amber-ink">{problem}</Text>
              </View>
            ) : (
              <Text className="font-body text-xs text-subtle">
                English or Tagalog, in your own words.{text.length > MAX_INPUT_CHARS - 100 ? ` ${text.length}/${MAX_INPUT_CHARS}` : ""}
              </Text>
            )}
            <View className="flex-row justify-between pt-1">
              {QUICK.map((q, i) => {
                const I = SERVICE_ICON[q.service];
                const on = text === q.text;
                return (
                  <Animated.View key={q.service} entering={FadeInDown.delay(i * 40).duration(250)} className="w-[19%]">
                    <Pressable accessibilityLabel={`Example: ${q.label}`} onPress={() => {
                        setDraftText(q.text);
                        setProblem(null);
                      }} className="items-center gap-1 active:opacity-70">
                      <View className={`h-12 w-12 items-center justify-center rounded-2xl ${on ? "bg-lime" : "bg-info-bg"}`}>
                        <I size={22} color={C.navy} weight="fill" />
                      </View>
                      <Text className="font-body text-[11px] text-muted" numberOfLines={1}>
                        {q.label}
                      </Text>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>

          <View className="gap-3 rounded-3xl border border-border bg-surface px-4 py-[14px]">
            <View className="flex-row items-center justify-between">
              <Text className="font-body-bold text-[11px] uppercase tracking-widest text-navy">How Ask AI helps</Text>
              <View className="rounded-full bg-ok-bg px-[10px] py-1">
                <Text className="font-body-bold text-[11px] uppercase tracking-wide text-ok">Free · offline</Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              {["Reads your problem", "Picks the right worker", "Shows a fair price"].map((t, i) => (
                <View key={t} className="flex-1 items-center gap-[6px]">
                  <View className="h-7 w-7 items-center justify-center rounded-full bg-navy">
                    <Text className="font-body-bold text-xs text-white">{i + 1}</Text>
                  </View>
                  <Text className="text-center font-body text-xs text-ink">{t}</Text>
                </View>
              ))}
            </View>
            {stats.loadState === "loading" ? <Text className="font-body text-xs text-subtle">Loading the AI on your phone…</Text> : null}
          </View>

          <ToolCards />
        </ScrollView>

        <AskDock ready={ready} onPress={() => (ready ? void analyze() : input.current?.focus())} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Artboard B1 dock: tooltip + the big amber "Check my problem" pill with a ringed navy orb. */
function AskDock({ ready, onPress }: { ready: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  return (
    <View className="items-center gap-[10px] rounded-t-[28px] bg-surface px-4 pb-3 pt-[14px]" style={{ elevation: 12, shadowColor: C.navy, shadowOpacity: 0.12, shadowRadius: 18, shadowOffset: { width: 0, height: -8 } }}>
      <View className="items-center">
        <View className="flex-row items-center gap-2 rounded-[14px] bg-navy px-[14px] py-2">
          <Sparkle size={16} color={C.lime} weight="fill" />
          <Text className="font-body-bold text-[14px] text-white">{ready ? "Tap here to ask the AI" : "Type your problem, then tap here"}</Text>
        </View>
        <View className="-mt-[6px] h-3 w-3 rotate-45 bg-navy" />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Check my problem: ask the AI"
        onPress={onPress}
        className="h-[76px] w-full flex-row items-center gap-3 rounded-full bg-lime pl-[26px] pr-[10px] active:opacity-90"
        style={{ borderWidth: 4, borderColor: "#FEF3C7", elevation: 8, shadowColor: C.lime, shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 10 } }}
      >
        <View className="flex-1">
          <Text className="font-body-bold text-[20px] leading-[26px] text-navy">Check my problem</Text>
          <Text className="font-body-bold text-[13px] leading-[18px]" style={{ color: "#7A3E06" }}>
            Ask AI · free · works offline
          </Text>
        </View>
        <View className="h-14 w-14 items-center justify-center">
          {reduced ? null : [0, 900].map((d) => <OrbRing key={d} delay={d} />)}
          <View className="h-14 w-14 items-center justify-center rounded-full bg-navy">
            <Sparkle size={26} color={C.white} weight="fill" />
          </View>
        </View>
      </Pressable>
    </View>
  );
}

function OrbRing({ delay }: { delay: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.cubic) }), -1));
  }, [delay, t]);
  const style = useAnimatedStyle(() => ({ opacity: 0.7 * (1 - t.value), transform: [{ scale: 1 + 0.45 * t.value }] }));
  return <Animated.View style={style} className="absolute h-14 w-14 rounded-full border-2 border-navy" />;
}

// One tap fills a real-sounding problem per service (the first two are the demo phrases).
const QUICK: { service: ServiceCode; label: string; text: string }[] = [
  { service: "PLUMBING", label: "Plumbing", text: "May tulo sa ilalim ng lababo namin" },
  { service: "ELECTRICAL", label: "Electric", text: "Nag-spark yung saksakan nung sinaksak ko yung charger" },
  { service: "CARPENTRY", label: "Carpentry", text: "Sira ang bisagra ng pinto namin, hindi na sumasara" },
  { service: "AIRCON", label: "Aircon", text: "Hindi na lumalamig ang aircon namin" },
  { service: "WELDING", label: "Welding", text: "Bumigay ang hinang ng gate namin na bakal" },
];

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
