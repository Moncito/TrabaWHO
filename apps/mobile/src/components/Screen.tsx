import { Link, router, useFocusEffect, type Href } from "expo-router";
import { setStatusBarStyle } from "expo-status-bar";
import { AirplaneTilt, ArrowsClockwise, CaretLeft, CheckCircle, WarningCircle } from "phosphor-react-native";
import { BottomTabBarHeightContext } from "expo-router/tabs";
import { useCallback, useContext, type ReactNode } from "react";
import { KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { Easing, FadeInDown, FadeInUp, FadeOutUp, LinearTransition, ReduceMotion } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

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
  const insets = useSafeAreaInsets();
  // Inside the tabs the pill tab bar already clears the system nav bar; elsewhere the footer must.
  const inTabs = useContext(BottomTabBarHeightContext) !== undefined;
  const footerPad = inTabs ? 12 : Math.max(insets.bottom, 12) + 4;
  const body = <View className="gap-3 px-5 pb-8 pt-5">{children}</View>;
  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-navy">
      <View className="z-10 flex-row items-center gap-3 rounded-b-[28px] bg-navy px-5 pb-5 pt-2">
        {back ? (
          <Pressable accessibilityLabel="Bumalik" onPress={() => router.back()} className="h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <CaretLeft size={22} color={C.white} weight="bold" />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text className="font-headline text-[24px] leading-[29px] text-white" numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? <Text className="font-body text-[13px] text-haze">{subtitle}</Text> : null}
        </View>
        {right}
      </View>
      <KeyboardAvoidingView behavior="padding" className="-mt-7 flex-1 bg-soft pt-7">
        <OfflineBanner />
        <Animated.View layout={LinearTransition} className="flex-1">
          {scroll ? <ScrollView keyboardShouldPersistTaps="handled">{body}</ScrollView> : body}
        </Animated.View>
        {footer ? (
          <View className="gap-2 rounded-t-[28px] border-t border-border bg-surface px-5 pt-3" style={{ paddingBottom: footerPad, elevation: 8, shadowColor: C.navy, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } }}>
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * Offline pill (DESIGN S01 #1, A5). Visible on the projector during the airplane-mode demo.
 * Inset + rounded so it sits cleanly under the curved header instead of leaving corner gaps.
 */
export function OfflineBanner() {
  const { online } = useNetwork();
  const pending = useOutbox().filter((r) => r.status !== "sent").length;
  if (online) return null;
  return (
    <Animated.View entering={FadeInUp} exiting={FadeOutUp} className="mx-5 mt-3 flex-row items-center gap-2 rounded-2xl bg-charcoal px-4 py-[10px]">
      <AirplaneTilt size={18} color={C.lime} weight="fill" />
      <Text className="flex-1 font-body-semibold text-[13px] text-white">
        {pending ? `Offline · ${pending} waiting to send` : "Offline. The AI still works."}
      </Text>
    </Animated.View>
  );
}

export function HeaderLink({ href, label, children }: { href: Href; label: string; children: ReactNode }) {
  return (
    <Link href={href} asChild>
      <Pressable accessibilityLabel={label} className="min-h-11 min-w-11 items-center justify-center active:opacity-70">
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
        // Short eased drop, no spring: the old slide from off-screen bounced on arrival.
        entering={FadeInDown.duration(200).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System)}
        exiting={FadeOutUp.duration(150).reduceMotion(ReduceMotion.System)}
        className="flex-row items-center gap-2 rounded-2xl bg-charcoal px-4 py-3"
        style={{ elevation: 6 }}
      >
        <I size={18} color={t.kind === "error" ? "#FCA5A5" : t.kind === "synced" ? "#34D399" : C.lime} weight="bold" />
        <Text className="font-body-semibold text-sm text-white">{t.text}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

/** Status bar icon colour while this screen is focused (root default is light, for the navy headers). */
export function useStatusBarStyle(style: "light" | "dark") {
  // Focus-based: tab screens stay mounted, so a <StatusBar> element would not switch back.
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle(style);
      return () => setStatusBarStyle("light");
    }, [style]),
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-3xl border border-border bg-white p-4">
      <Text className="font-body text-sm text-muted">{children}</Text>
    </View>
  );
}
