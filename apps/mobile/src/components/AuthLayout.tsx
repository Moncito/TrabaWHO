import { router } from "expo-router";
import { CaretLeft } from "phosphor-react-native";
import type { ReactNode } from "react";
import { Image, KeyboardAvoidingView, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { useStatusBarStyle } from "./Screen";
import { C } from "./ui";

/** White auth screens (artboards A1/A2): back, logo, title with one highlighted word, form, footer links. */
export function AuthLayout({
  title,
  mark,
  after,
  subtitle,
  back,
  logoSize = 112,
  footer,
  children,
}: {
  title: string;
  mark?: string;
  after?: string;
  subtitle: string;
  back?: boolean;
  logoSize?: number;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useStatusBarStyle("dark");
  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-surface">
      <View className="h-12 flex-row items-center px-3">
        {back ? (
          <Pressable accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/welcome"))} className="h-11 w-11 items-center justify-center rounded-full bg-soft active:opacity-70">
            <CaretLeft size={20} color={C.ink} weight="bold" />
          </Pressable>
        ) : null}
      </View>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="flex-grow px-5 pb-6">
          <Animated.View entering={FadeInDown.duration(300)} className="items-center gap-1">
            <Image source={require("../../assets/images/logo.png")} style={{ width: logoSize, height: logoSize, marginTop: -16 }} resizeMode="contain" accessibilityLabel="TrabaWHO logo" />
            <Text className="text-center font-headline text-[28px] leading-[34px] text-ink">
              {title}
              {mark ? <Text style={{ color: C.navy, backgroundColor: "#FEF3C7" }}>{` ${mark} `}</Text> : null}
              {after ?? ""}
            </Text>
            <Text className="text-center font-body text-[14px] text-muted">{subtitle}</Text>
          </Animated.View>
          <View className="gap-4 pt-6">{children}</View>
          {footer ? <View className="mt-auto items-center gap-1 pt-6">{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Inline text link used in auth footers ("Create an account", "Log in"). */
export function TextLink({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Text accessibilityRole="link" onPress={onPress} className="font-body-bold text-navy underline">
      {label}
    </Text>
  );
}
