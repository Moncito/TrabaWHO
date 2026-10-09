import { useNetInfo } from "@react-native-community/netinfo";
import { useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { aiStats, canImportModel, importModelFromPicker, useAiStats } from "@/ai";
import { Screen } from "@/components/Screen";

const secs = (ms?: number) => (ms === undefined ? "-" : `${(ms / 1000).toFixed(2)} s`);

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 rounded-xl bg-white p-3">
      <Text className="font-body text-xs uppercase text-muted">{label}</Text>
      <Text className="font-body-bold text-lg text-charcoal">{value}</Text>
    </View>
  );
}

/** Demo "proof" screen: shows the AI is on the phone, and how fast it is. */
export default function AiStatsScreen() {
  const s = useAiStats();
  const net = useNetInfo();
  const offline = net.isConnected === false || net.isInternetReachable === false;

  const modelCalls = s.calls.filter((c) => c.source === "model");
  const avg = modelCalls.length ? modelCalls.reduce((t, c) => t + c.latencyMs, 0) / modelCalls.length : undefined;
  const tps = modelCalls.find((c) => c.tokensPerSecond)?.tokensPerSecond;
  const onDevice = s.backend === "llama";
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState<string | null>(null);

  async function importModel() {
    setImporting(true);
    setImportMsg("Kinokopya ang model (~1 minuto)...");
    try {
      const ok = await importModelFromPicker();
      setImportMsg(ok ? "Model loaded." : null);
    } catch (e) {
      setImportMsg(`Hindi na-load: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setImporting(false);
    }
  }

  return (
    <Screen title="AI sa phone">
      <View className={`rounded-xl p-4 ${offline ? "bg-charcoal" : "bg-white"}`}>
        <Text className={`font-body-bold text-base ${offline ? "text-lime" : "text-charcoal"}`}>
          {offline ? "Walang internet. AI is running on this phone." : "Online. AI still runs on this phone."}
        </Text>
        <Text className={`font-body text-sm ${offline ? "text-soft" : "text-muted"}`}>
          {onDevice
            ? `Model: ${s.modelId} (llama.rn, on-device)`
            : s.backend === "ollama"
              ? `Model: ${s.modelId} (Edge mode: laptop over hotspot)`
              : "Stub mode: keyword rules only, no model loaded"}
        </Text>
      </View>

      <View className="flex-row gap-3">
        <Stat label="Model load" value={s.loadState === "ready" ? secs(s.loadMs) : s.loadState} />
        <Stat label="Avg answer" value={secs(avg)} />
      </View>
      <View className="flex-row gap-3">
        <Stat label="Tokens / s" value={tps ? String(tps) : "-"} />
        <Stat label="Model answers" value={`${modelCalls.length}/${s.calls.length}`} />
      </View>
      <View className="flex-row gap-3">
        <Stat
          label="Prompt warm-up"
          value={s.warmupMs !== undefined ? secs(s.warmupMs) : s.loadState === "ready" && onDevice ? "warming up..." : "-"}
        />
      </View>
      {s.loadError ? <Text className="font-body text-sm text-emergency">Load error: {s.loadError}</Text> : null}
      {s.modelPath ? <Text className="font-body text-xs text-muted">File: {s.modelPath}</Text> : null}

      {canImportModel ? (
        <View className="gap-2">
          <Pressable
            className="rounded-xl bg-lime px-4 py-3 disabled:opacity-50"
            disabled={importing}
            onPress={importModel}
          >
            {importing ? (
              <ActivityIndicator color="#1F2937" />
            ) : (
              <Text className="text-center font-body-bold text-charcoal">Pumili ng model file (.gguf)</Text>
            )}
          </Pressable>
          {importMsg ? <Text className="font-body text-sm text-charcoal">{importMsg}</Text> : null}
        </View>
      ) : null}

      <Text className="font-body-bold text-base text-charcoal">Recent calls</Text>
      {s.calls.length === 0 ? (
        <Text className="font-body text-sm text-muted">No AI calls yet. Try "Ano ang problema?".</Text>
      ) : (
        s.calls.map((c) => (
          <View key={c.at} className="flex-row justify-between rounded-lg bg-white px-3 py-2">
            <Text className="font-body text-sm text-charcoal">
              {c.kind} · {c.source}
              {c.attempts > 1 ? ` · ${c.attempts} tries` : ""}
            </Text>
            <Text className="font-body-medium text-sm text-charcoal">
              {secs(c.latencyMs)}
              {c.tokensPerSecond ? ` · ${c.tokensPerSecond} tok/s` : ""}
            </Text>
          </View>
        ))
      )}

      <Pressable className="rounded-xl border border-border px-4 py-3" onPress={() => aiStats.reset()}>
        <Text className="text-center font-body-medium text-charcoal">Reset stats</Text>
      </Pressable>
    </Screen>
  );
}
