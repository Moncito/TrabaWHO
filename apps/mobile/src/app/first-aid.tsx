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
import { CalendarCheck, FirstAidKit, PaperPlaneRight } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, TextInput, View } from "react-native";
import Animated, { FadeInUp } from "react-native-reanimated";

import { ai } from "@/ai";
import { Screen } from "@/components/Screen";
import { Button, C, HazardAlert } from "@/components/ui";
import { useSession } from "@/data/session";
import { setDraftCard, setDraftText } from "@/state/draft";

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

  async function send() {
    const q = input.trim();
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
      title="First-aid habang naghihintay"
      subtitle="AI sa phone. Hindi pang-DIY: para lang ligtas ka hanggang dumating ang worker."
      back
      footer={
        <View className="flex-row items-end gap-2">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Hal. tumutulo ang tubo sa ilalim ng lababo"
            placeholderTextColor={C.subtle}
            multiline
            className="max-h-28 min-h-12 flex-1 rounded-[14px] border border-border-strong bg-surface px-4 py-3 font-body text-[15px] text-ink"
          />
          <View className="w-24">
            <Button label="Send" icon={PaperPlaneRight} size="md" onPress={send} loading={busy} disabled={!input.trim()} />
          </View>
        </View>
      }
    >
      {/* Newest turn first: the latest answer shows right under the header without scrolling. */}
      {msgs.map((m, idx) =>
          m.from === "user" ? (
            <View key={m.id} className="gap-3">
              <Animated.View entering={FadeInUp.duration(200)} className="max-w-[85%] self-end rounded-2xl rounded-br-sm bg-ink px-4 py-3">
                <Text className="font-body text-[15px] text-white">{m.text}</Text>
              </Animated.View>
              {busy && idx === 0 ? (
                <View className="flex-row items-center gap-2 self-start rounded-2xl bg-surface px-4 py-3">
                  <ActivityIndicator color={C.ink} />
                  <Text className="font-body text-[14px] text-muted">Tinitingnan ng AI sa phone...</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <Animated.View key={m.id} entering={FadeInUp.duration(250)} className="max-w-[92%] gap-3 self-start rounded-2xl rounded-bl-sm border border-border bg-surface p-4">
              <View className="flex-row items-center gap-2">
                <FirstAidKit size={18} color={C.danger} weight="fill" />
                <Text className="flex-1 font-body-bold text-[15px] text-ink">{m.text}</Text>
              </View>
              {"card" in m ? (
                <>
                  {m.card.safetyNotes.length ? (
                    <HazardAlert notes={m.card.safetyNotes} showHotline={m.card.showEmergencyHotline} hotline={m.card.emergencyHotline} />
                  ) : null}
                  <Text className="font-body-semibold text-[14px] text-ink">Habang hinihintay ang {m.card.serviceNameTl.toLowerCase()}:</Text>
                  {firstAidFor(m.card.service).map((s, i) => (
                    <View key={s} className="flex-row gap-2">
                      <Text className="w-5 font-body-bold text-[14px] text-ink">{i + 1}.</Text>
                      <Text className="flex-1 font-body text-[14px] leading-[20px] text-ink">{s}</Text>
                    </View>
                  ))}
                  <Text className="font-body text-xs leading-[17px] text-subtle">{FIRST_AID_DISCLAIMER_TL}</Text>
                  {user?.role === "CLIENT" ? (
                    <Button label={`I-book ang ${m.card.serviceNameTl}`} icon={CalendarCheck} onPress={() => book(m.card, m.question)} />
                  ) : null}
                </>
              ) : null}
            </Animated.View>
          ),
        )}
    </Screen>
  );
}
