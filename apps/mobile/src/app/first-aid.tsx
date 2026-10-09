import {
  detectHazards,
  FIRST_AID_DISCLAIMER_TL,
  FIRST_AID_GREETING_TL,
  FIRST_AID_OFF_TOPIC_TL,
  firstAidFor,
  keywordIntake,
  type BookingCardData,
} from "@trabawho/shared";
import { router } from "expo-router";
import { CalendarCheck, ChatCircleText, FirstAidKit, Info, PaperPlaneRight } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ai } from "@/ai";
import { Screen } from "@/components/Screen";
import { Button, C, HazardAlert, Label, serviceNameEn } from "@/components/ui";
import { useSession } from "@/data/session";
import { setDraftCard, setDraftText } from "@/state/draft";

// Tap-to-try prompts (the two demo phrases).
const EXAMPLES = ["May tulo sa ilalim ng lababo namin", "Nag-spark yung saksakan nung sinaksak ko yung charger"];

type Msg =
  | { id: number; from: "user"; text: string }
  | { id: number; from: "bot"; text: string }
  | { id: number; from: "bot"; text: string; card: BookingCardData; question: string };

/**
 * Restricted first-aid chatbot ("Habang hinihintay"). The on-device AI only classifies the message
 * (same intake pipeline as booking); every step shown is team-written (packages/shared/src/firstaid.ts)
 * and every answer points back to booking a professional through TrabaWho.
 */
export default function FirstAid() {
  const user = useSession();
  const [msgs, setMsgs] = useState<Msg[]>([{ id: 0, from: "bot", text: FIRST_AID_GREETING_TL }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => void ai.prewarm?.("intake"), []);

  async function send(text = input) {
    const q = text.trim();
    if (!q || busy) return;
    setInput("");
    setBusy(true);
    // Newest turn first: [question, answer, older question, older answer, ..., greeting].
    setMsgs((m) => [{ id: Date.now(), from: "user", text: q }, ...m]);
    try {
      const card = await ai.intake(q);
      // Off-topic guard: nothing classified, or a low-confidence guess with no repair/hazard words at all.
      const offTopic = !card || (card.lowConfidence && !keywordIntake(q) && detectHazards(q).length === 0);
      setMsgs((m) => [
        m[0]!,
        offTopic || !card
          ? { id: Date.now() + 1, from: "bot", text: FIRST_AID_OFF_TOPIC_TL }
          : { id: Date.now() + 1, from: "bot", text: `Mukhang ${card.taskNameTl.toLowerCase()} ito.`, card, question: q },
        ...m.slice(1),
      ]);
    } finally {
      setBusy(false);
    }
  }

  function book(card: BookingCardData, question: string) {
    setDraftText(question);
    setDraftCard(card);
    router.push("/booking-card");
  }

  return (
    <Screen
      title="While you wait"
      subtitle="Habang hinihintay · safe steps only, not DIY"
      back
      footer={
        <View className="flex-row items-end gap-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Describe what's happening…"
            placeholderTextColor={C.subtle}
            multiline
            className="max-h-28 min-h-12 flex-1 rounded-[24px] border-[1.5px] border-border-strong bg-surface px-4 py-3 font-body text-[15px] text-ink focus:border-navy"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send"
            disabled={!input.trim() || busy}
            onPress={() => void send()}
            className={`h-12 w-12 items-center justify-center rounded-full bg-lime active:opacity-80 ${!input.trim() || busy ? "opacity-50" : ""}`}
          >
            {busy ? <ActivityIndicator color={C.navy} /> : <PaperPlaneRight size={22} color={C.navy} weight="fill" />}
          </Pressable>
        </View>
      }
    >
      {msgs.length === 1 ? (
        <View className="gap-2">
          <Label>Try asking</Label>
          {EXAMPLES.map((e) => (
            <Pressable key={e} onPress={() => void send(e)} className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3 active:opacity-80">
              <ChatCircleText size={18} color={C.navy} weight="bold" />
              <Text className="flex-1 font-body text-[14px] text-ink">{e}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {/* Newest turn first: the latest answer shows right under the header without scrolling. */}
      {msgs.map((m, idx) =>
          m.from === "user" ? (
            <View key={m.id} className="gap-3">
              <Animated.View entering={FadeInUp.duration(200)} className="max-w-[85%] self-end rounded-[20px] rounded-br-md bg-navy px-4 py-3">
                <Text className="font-body text-[15px] leading-[22px] text-white">{m.text}</Text>
              </Animated.View>
              {busy && idx === 0 ? (
                <View className="flex-row items-center gap-2 self-start rounded-[20px] rounded-bl-md border border-border bg-surface px-4 py-3">
                  <ActivityIndicator color={C.navy} />
                  <Text className="font-body text-[14px] text-muted">Checking on your phone…</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Animated.View key={m.id} entering={FadeInUp.duration(250)} className="max-w-[92%] gap-3 self-start rounded-[20px] rounded-bl-md border border-border bg-surface p-4">
              <View className="flex-row items-center gap-2">
                <FirstAidKit size={18} color={C.lime} weight="fill" />
                <Text className="flex-1 font-body-bold text-[15px] text-ink">{m.text}</Text>
              </View>
              {"card" in m ? (
                <>
                  {m.card.safetyNotes.length ? (
                    <HazardAlert notes={m.card.safetyNotes} showHotline={m.card.showEmergencyHotline} hotline={m.card.emergencyHotline} />
                  ) : null}
                  <Text className="font-body-bold text-[11px] uppercase tracking-widest text-navy">While you wait for the {serviceNameEn(m.card.service).toLowerCase()}</Text>
                  {firstAidFor(m.card.service).map((s, i) => (
                    <View key={s} className="flex-row items-start gap-3">
                      <View className="h-6 w-6 items-center justify-center rounded-full bg-navy">
                        <Text className="font-body-bold text-xs text-white">{i + 1}</Text>
                      </View>
                      <Text className="flex-1 font-body text-[14px] leading-[21px] text-ink">{s}</Text>
                    </View>
                  ))}
                  {user?.role === "CLIENT" ? (
                    <Button label={`Book ${/^[aeiou]/i.test(serviceNameEn(m.card.service)) ? "an" : "a"} ${serviceNameEn(m.card.service)}`} icon={CalendarCheck} onPress={() => book(m.card, m.question)} />
                  ) : null}
                  <View className="flex-row items-start gap-2">
                    <Info size={14} color={C.subtle} style={{ marginTop: 2 }} />
                    <Text className="flex-1 font-body text-xs leading-[17px] text-subtle">{FIRST_AID_DISCLAIMER_TL}</Text>
                  </View>
                </>
              ) : null}
            </Animated.View>
          ),
        )}
    </Screen>
  );
}
