import { CheckCircle, X } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { Easing, FadeIn, ReduceMotion, SlideInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CANCEL_REASONS } from "@/data/bookings";

import { Button, C, Label } from "./ui";

/**
 * Artboard B3 "Why are you cancelling?": pick one reason, then confirm.
 * Rendered by the root-stack `cancel-booking` route (transparentModal), not an RN Modal: on Android 16
 * edge-to-edge a Modal window drew the sheet offset from its layout, leaving the tab bar showing below it.
 */
export function CancelSheet({ busy, error, onClose, onConfirm }: { busy: boolean; error: string | null; onClose: () => void; onConfirm: (reason: string) => void }) {
  const insets = useSafeAreaInsets();
  const [picked, setPicked] = useState<string>("fixed");
  const [more, setMore] = useState("");
  const label = CANCEL_REASONS.find((r) => r.id === picked)?.label ?? "";
  const reason = picked === "other" && more.trim() ? more.trim() : label;

  return (
    <Animated.View entering={FadeIn.duration(120)} className="flex-1 justify-end" style={{ backgroundColor: "rgba(0,26,77,0.55)" }}>
      <Pressable accessibilityLabel="Close" className="flex-1" onPress={onClose} />
      <Animated.View
        // One short, calm slide (no spring overshoot); skipped entirely when the phone asks for reduced motion.
        entering={SlideInDown.duration(220).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System)}
        accessibilityViewIsModal
        className="gap-3 rounded-t-[28px] bg-surface px-5 pt-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <View className="h-1 w-10 self-center rounded-full bg-border-strong" />
        <View className="flex-row items-start gap-3">
          <View className="flex-1 gap-[2px]">
            <Text className="font-headline text-[20px] leading-[26px] text-navy">Why are you cancelling?</Text>
            <Text className="font-body text-[13px] text-muted">Bakit mo ika-cancel? This helps us match you better.</Text>
          </View>
          <Pressable accessibilityLabel="Close" onPress={onClose} className="h-10 w-10 items-center justify-center rounded-full bg-soft">
            <X size={18} color={C.ink} weight="bold" />
          </Pressable>
        </View>

        <View className="flex-row items-center gap-2 rounded-2xl bg-ok-bg px-3 py-[10px]">
          <CheckCircle size={18} color={C.ok} weight="fill" />
          <Text className="flex-1 font-body-bold text-[13px] text-ok">Free to cancel. No worker has accepted yet.</Text>
        </View>

        <Label>Pick one reason</Label>
        <View accessibilityRole="radiogroup" className="gap-2">
          {CANCEL_REASONS.map((r) => {
            const on = picked === r.id;
            return (
              <Pressable
                key={r.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                onPress={() => setPicked(r.id)}
                className={`min-h-[50px] flex-row items-center gap-3 rounded-2xl px-[14px] ${on ? "border-[1.5px] border-navy bg-info-bg" : "border-[1.5px] border-border bg-surface"}`}
              >
                <View className={`h-5 w-5 items-center justify-center rounded-full border-2 ${on ? "border-navy" : "border-border-strong"}`}>
                  {on ? <View className="h-[10px] w-[10px] rounded-full bg-navy" /> : null}
                </View>
                <Text className={`flex-1 text-[15px] ${on ? "font-body-bold text-navy" : "font-body text-ink"}`}>{r.label}</Text>
              </Pressable>
            );
          })}
        </View>
        {picked === "other" ? (
          <TextInput
            value={more}
            onChangeText={setMore}
            placeholder="Tell us more (optional)"
            placeholderTextColor={C.subtle}
            multiline
            className="min-h-[72px] rounded-2xl border-[1.5px] border-border-strong bg-surface px-4 py-3 font-body text-[15px] text-ink"
            textAlignVertical="top"
          />
        ) : null}
        {error ? <Text className="font-body-bold text-[13px] text-danger-ink">{error}</Text> : null}

        <View className="flex-row gap-3 pt-1">
          <View className="flex-1">
            <Button label="Keep booking" size="sm" variant="ghost" onPress={onClose} />
          </View>
          <View className="flex-1">
            <Button label="Cancel booking" size="sm" variant="danger" loading={busy} onPress={() => onConfirm(reason)} />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}
