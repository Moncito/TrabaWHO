import type { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { C } from "./ui";

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>["tabBar"]>>[0];

/** Floating pill tab bar (artboard v3): amber pill marks the active tab. */
export function PillTabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();
  return (
    <View className="bg-soft px-4 pt-2" style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
      <View className="flex-row rounded-[28px] border border-border bg-surface p-2" style={{ elevation: 8, shadowColor: C.navy, shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } }}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          // Expo Router hides `href: null` screens with display: none.
          const itemStyle = options.tabBarItemStyle as { display?: string } | undefined;
          if (itemStyle?.display === "none") return null;
          const focused = state.index === index;
          const label = typeof options.title === "string" ? options.title : route.name;
          const color = focused ? C.navy : C.muted;
          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
          };
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={onPress}
              className={`min-h-12 flex-1 items-center justify-center gap-[2px] rounded-[20px] py-[6px] ${focused ? "bg-lime" : ""}`}
            >
              {options.tabBarIcon?.({ focused, color, size: 22 })}
              <Text className={`text-xs ${focused ? "font-body-bold text-navy" : "font-body text-muted"}`}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
