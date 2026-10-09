import { Link, type Href } from "expo-router";
import type { ReactNode } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/** Placeholder shell for stub screens. Replace with real UI from the design artboard. */
export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <SafeAreaView className="flex-1 bg-soft">
      <ScrollView contentContainerClassName="gap-4 p-4">
        <Text className="font-headline text-3xl uppercase text-charcoal">{title}</Text>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function NavButton({ href, label }: { href: Href; label: string }) {
  return (
    <Link href={href} asChild>
      <Pressable className="rounded-xl bg-lime px-4 py-3 active:opacity-80">
        <Text className="text-center font-body-bold text-base text-charcoal">{label}</Text>
      </Pressable>
    </Link>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <View className="rounded-xl border border-border bg-white p-4">
      <Text className="font-body text-sm text-muted">{children}</Text>
    </View>
  );
}
