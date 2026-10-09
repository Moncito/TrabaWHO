import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput } from "react-native";

import { Note, Screen } from "@/components/Screen";
import { ai } from "@/ai";
import { setDraftCard } from "@/state/draft";

export default function NewProblem() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  async function analyze() {
    setBusy(true);
    try {
      setDraftCard(await ai.intake(text));
      router.push("/booking-card");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title="Ano ang problema?">
      <TextInput
        className="min-h-32 rounded-xl border border-border bg-white p-4 font-body text-base text-charcoal"
        multiline
        placeholder="Hal. Ayaw gumana ng saksakan sa kusina, nag-spark kanina"
        value={text}
        onChangeText={setText}
        textAlignVertical="top"
      />
      <Pressable
        className="rounded-xl bg-lime px-4 py-3 disabled:opacity-50"
        disabled={!text.trim() || busy}
        onPress={analyze}
      >
        {busy ? <ActivityIndicator color="#1F2937" /> : <Text className="text-center font-body-bold text-charcoal">Suriin</Text>}
      </Pressable>
      <Note>AI runs on this phone. Works without internet.</Note>
    </Screen>
  );
}
