import { router } from "expo-router";
import { AirplaneTilt, CheckCircle, CloudArrowUp, Cpu, HandCoins, SealCheck, ShieldCheck, Sparkle } from "phosphor-react-native";
import { useEffect, type ReactNode } from "react";
import { Image, Pressable, Text, useWindowDimensions, View } from "react-native";
import Animated, {
  Extrapolation,
  FadeIn,
  FadeInDown,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
  type SharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, C, SERVICE_ICON } from "@/components/ui";
import { startGuest } from "@/data/session";

type Slide = { key: string; title: string; tl: string; body: string; art: ReactNode };

const SLIDES: Slide[] = [
  {
    key: "logo",
    title: "Welcome to TrabaWHO.",
    tl: "Maaasahang tulong sa bahay.",
    body: "Trusted home repairs near you: plumbers, electricians, carpenters, aircon and welding.",
    art: <LogoArt />,
  },
  {
    key: "describe",
    title: "Fix anything at home.",
    tl: "Sabihin lang ang problema.",
    body: "Type it in Taglish, Filipino or English. The AI finds the right worker, the safety steps and a fair price.",
    art: <DescribeArt />,
  },
  {
    key: "offline",
    title: "Works even offline.",
    tl: "Kahit walang signal.",
    body: "The AI runs on your phone. No data? Your booking is saved and sends itself when you're back online.",
    art: <OfflineArt />,
  },
  {
    key: "safe",
    title: "Safe from start to finish.",
    tl: "Ligtas mula umpisa hanggang matapos.",
    body: "Verified workers, safety alerts for gas and sparks, a scam check, and you pay cash only after the job.",
    art: <SafeArt />,
  },
];

/** Welcome / onboarding: three swipeable slides on navy, then sign up or log in. */
export default function Welcome() {
  const { width } = useWindowDimensions();
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
  });

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-navy-deep">
      <Animated.View entering={FadeIn.duration(400)} className="flex-row items-center justify-between px-6 pt-3">
        <Text className="font-headline text-[22px] text-white">
          Traba<Text className="text-lime">WHO</Text>
        </Text>
        <View className="flex-row items-center gap-1 rounded-full bg-white/10 px-3 py-1">
          <Cpu size={14} color={C.lime} weight="bold" />
          <Text className="font-body-bold text-[11px] uppercase tracking-wide text-white">AI on your phone</Text>
        </View>
      </Animated.View>

      <Animated.ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {SLIDES.map((s, i) => (
          <View key={s.key} style={{ width }} className="px-6">
            <View className="flex-1 items-center justify-center">{s.art}</View>
            <SlideText slide={s} index={i} x={x} width={width} />
          </View>
        ))}
      </Animated.ScrollView>

      <View className="flex-row justify-center gap-2 pb-6 pt-4">
        {SLIDES.map((s, i) => (
          <Dot key={s.key} index={i} x={x} width={width} />
        ))}
      </View>

      <Animated.View entering={FadeInDown.delay(250).duration(400)} className="gap-3 px-6 pb-4">
        <Button label="Sign up · Mag-sign up" onPress={() => router.push("/signup")} />
        <Button label="Log in · Mag-log in" variant="onDark" onPress={() => router.push("/login")} />
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            startGuest();
            router.replace("/");
          }}
          className="items-center py-2 active:opacity-70"
        >
          <Text className="font-body-bold text-[15px] text-lime">Try the AI without an account</Text>
          <Text className="font-body text-xs text-haze">Subukan nang walang account · works offline</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

function SlideText({ slide, index, x, width }: { slide: Slide; index: number; x: SharedValue<number>; width: number }) {
  // Text drifts and fades with the swipe so the page change feels connected.
  const style = useAnimatedStyle(() => {
    const p = (x.value - index * width) / width;
    return {
      opacity: interpolate(p, [-0.6, 0, 0.6], [0, 1, 0], Extrapolation.CLAMP),
      transform: [{ translateX: interpolate(p, [-1, 0, 1], [60, 0, -60], Extrapolation.CLAMP) }],
    };
  });
  return (
    <Animated.View style={style} className="gap-2 pb-2">
      <Text className="font-headline text-[32px] leading-[38px] text-white">{slide.title}</Text>
      <Text className="font-body-bold text-[15px] text-lime">{slide.tl}</Text>
      <Text className="font-body text-[16px] leading-[24px] text-haze">{slide.body}</Text>
    </Animated.View>
  );
}

function Dot({ index, x, width }: { index: number; x: SharedValue<number>; width: number }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(x.value / width - index);
    return {
      width: interpolate(d, [0, 1], [28, 8], Extrapolation.CLAMP),
      opacity: interpolate(d, [0, 1], [1, 0.35], Extrapolation.CLAMP),
    };
  });
  return <Animated.View style={style} className="h-2 rounded-full bg-lime" />;
}

// ---------- slide art: real app pieces (no stock people, no fake ratings) ----------

/** Slow breathing glow behind each illustration. Off when the phone asks for reduced motion. */
function Glow({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const s = useSharedValue(1);
  useEffect(() => {
    if (!reduced) s.value = withRepeat(withSequence(withTiming(1.08, { duration: 1800 }), withTiming(1, { duration: 1800 })), -1);
  }, [reduced, s]);
  const glow = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <View className="h-[300px] w-full items-center justify-center">
      <Animated.View style={glow} className="absolute h-[260px] w-[260px] rounded-full bg-white/5" />
      <View className="absolute h-[190px] w-[190px] rounded-full bg-white/5" />
      {children}
    </View>
  );
}

/** Slide 0: the brand mark in a white disc with a soft amber halo (artboard A00). */
function LogoArt() {
  return (
    <Glow>
      <Animated.View entering={ZoomIn.springify().damping(14)} className="h-[150px] w-[150px] items-center justify-center overflow-hidden rounded-full bg-white" style={{ borderWidth: 8, borderColor: "rgba(245,158,11,0.25)" }}>
        <Image source={require("../../assets/images/logo.png")} style={{ width: 140, height: 140 }} resizeMode="contain" accessibilityLabel="TrabaWHO logo" />
      </Animated.View>
    </Glow>
  );
}

function DescribeArt() {
  const services = Object.entries(SERVICE_ICON);
  return (
    <Glow>
      <View className="w-[280px] gap-3">
        <Animated.View entering={FadeInDown.delay(150).duration(400)} className="self-end rounded-[20px] rounded-br-md bg-white px-4 py-3">
          <Text className="font-body text-[15px] text-ink">May tulo sa ilalim ng lababo namin</Text>
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(450).duration(400)} className="flex-row items-center gap-3 self-start rounded-[20px] rounded-bl-md bg-lime px-4 py-3">
          <Sparkle size={20} color={C.navy} weight="fill" />
          <Text className="font-body-bold text-[15px] text-navy">Plumber · Fix a leaking sink</Text>
        </Animated.View>
        <View className="flex-row justify-center gap-2 pt-3">
          {services.map(([code, I], i) => (
            <Animated.View key={code} entering={ZoomIn.delay(700 + i * 80)} className="h-11 w-11 items-center justify-center rounded-2xl bg-navy">
              <I size={22} color={C.white} weight="fill" />
            </Animated.View>
          ))}
        </View>
      </View>
    </Glow>
  );
}

function OfflineArt() {
  return (
    <Glow>
      <View className="items-center gap-4">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-lime" style={{ elevation: 10 }}>
          <AirplaneTilt size={56} color={C.navy} weight="fill" />
        </View>
        <View className="w-[260px] gap-2">
          <ArtRow icon={<CloudArrowUp size={18} color={C.amberInk} weight="bold" />} box="bg-amber-bg" text="text-amber-ink" label="Booking saved on your phone" />
          <ArtRow icon={<CheckCircle size={18} color={C.ok} weight="fill" />} box="bg-ok-bg" text="text-ok" label="Sent when the signal is back" />
        </View>
      </View>
    </Glow>
  );
}

function SafeArt() {
  return (
    <Glow>
      <View className="items-center gap-4">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-white">
          <ShieldCheck size={60} color={C.navy} weight="fill" />
        </View>
        <View className="w-[260px] gap-2">
          <ArtRow icon={<SealCheck size={18} color={C.navy} weight="fill" />} box="bg-info-bg" text="text-navy" label="Verified workers" />
          <ArtRow icon={<HandCoins size={18} color={C.ok} weight="fill" />} box="bg-ok-bg" text="text-ok" label="Pay cash after the job" />
        </View>
      </View>
    </Glow>
  );
}

function ArtRow({ icon, box, text, label }: { icon: ReactNode; box: string; text: string; label: string }) {
  return (
    <View className={`flex-row items-center gap-2 rounded-2xl px-4 py-3 ${box}`}>
      {icon}
      <Text className={`flex-1 font-body-bold text-[14px] ${text}`}>{label}</Text>
    </View>
  );
}
