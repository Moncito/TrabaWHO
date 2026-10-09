import { Link, router, type Href } from "expo-router";
import { AirplaneTilt, ArrowsClockwise, CaretLeft, CheckCircle, WarningCircle } from "phosphor-react-native";
import type { ReactNode } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInUp, FadeOutUp, LinearTransition, SlideInUp, SlideOutUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useOutbox } from "@/data/bookings";
import { useNetwork } from "@/data/sync";
import { useToast } from "@/state/toast";

import { C } from "./ui";

/** Charcoal header + offline banner + scroll body + sticky footer (DESIGN §3.1 Screen/Header). */
export function Screen({
  title,
  subtitle,
  back,
  right,
  footer,
  children,
  scroll = true,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  scroll?: boolean;
}) {
  const body = <View className="gap-3 px-5 py-4">{children}</View>;
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-navy">
      <View className="flex-row items-center gap-3 bg-navy px-4 pb-4 pt-2">
        {back ? (
          <Pressable accessibilityLabel="Bumalik" onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <CaretLeft size={22} color={C.white} weight="bold" />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text className="font-headline text-[26px] leading-[30px] text-white" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? <Text className="font-body text-[13px] text-haze">{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      <KeyboardAvoidingView behavior="padding" className="flex-1 bg-soft">
        <OfflineBanner />
        <Animated.View layout={LinearTransition} className="flex-1">
          {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
        </Animated.View>
        {footer ? <View className="gap-2 border-t border-border bg-surface px-5 pb-6 pt-3">{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Amber strip when offline (DESIGN S01 #1, A5). Visible on the projector during the airplane-mode demo. */
function OfflineBanner() {
  const { online } = useNetwork();
  const pending = useOutbox().filter((r) => r.status !== "sent").length;
  if (online) return null;
  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} className="flex-row items-center gap-2 bg-charcoal px-5 py-[10px]">
      <AirplaneTilt size={18} color={C.lime} weight="fill" />
      <Text className="flex-1 font-body-semibold text-[13px] text-white">
        {pending ? `Offline · ${pending} item naghihintay ipadala` : "Offline. Gumagana pa rin ang AI."}
      </Text>
    </Animated.View>
  );
}

export function HeaderLink({ href, label, children }: { href: Href; label: string; children: ReactNode }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityLabel={label} className="h-11 w-11 items-center justify-center">
        {children}
      </Pressable>
    </Link>
  );
}

/** Top toast (DESIGN A4). Rendered once in the root layout. */
export function ToastHost() {
  const t = useToast();
  if (!t) return null;
  const I = t.kind === "syncing" ? ArrowsClockwise : t.kind === "synced" ? CheckCircle : WarningCircle;
  return (
    <SafeAreaView pointerEvents="none" className="absolute left-0 right-0 top-14 items-center px-4">
      <Animated.View
        key={t.id}
        entering={SlideInUp.springify().damping(18)}
        exiting={SlideOutUp}
        className="flex-row items-center gap-2 rounded-2xl bg-charcoal px-4 py-3"
        style={{ elevation: 6 }}
      >
        <I size={18} color={t.kind === "error" ? "#FCA5A5" : t.kind === "synced" ? "#34D399" : C.lime} weight="bold" />
        <Text className="font-body-semibold text-sm text-white">{t.text}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-3xl border border-border bg-white p-4">
      <Text className="font-body text-sm text-muted">{children}</Text>
    </View>
  );
}
