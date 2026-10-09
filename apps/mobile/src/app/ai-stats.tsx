import { useNetInfo } from "@react-native-community/netinfo";
import { AirplaneTilt, ArrowCounterClockwise, ChartLine, Cpu, FileArrowDown, WifiHigh } from "phosphor-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { aiStats, canImportModel, importModelFromPicker, useAiStats } from "@/ai";
import { Screen } from "@/components/Screen";
import { Button, C, Card, EmptyState, Label } from "@/components/ui";

const secs = (ms?: number) => (ms === undefined ? "–" : `${(ms / 1000).toFixed(1)} s`);
const KIND = { intake: "Problem check", report: "Job report", scam: "Scam check" } as const;
const LOAD = { idle: "Not loaded", loading: "Loading…", ready: "Ready", failed: "Failed" } as const;

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View className="flex-1 gap-1 rounded-3xl border border-border bg-surface p-4">
      <Label>{label}</Label>
      <Text className="font-headline text-[24px] leading-[28px] text-navy">{value}</Text>
      {hint ? <Text className="font-body text-xs text-subtle">{hint}</Text> : null}
    </View>
  );
}

/** Demo "proof" screen: the AI is on the phone, and this is how fast it is. */
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
    setImportMsg("Copying the model (about 1 minute)…");
    try {
      const ok = await importModelFromPicker();
      setImportMsg(ok ? "Model loaded." : null);
    } catch (e) {
      setImportMsg(`Not loaded: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setImporting(false);
    }
  }

  const engine = onDevice
    ? `${s.modelId} · llama.rn, on this phone`
    : s.backend === "ollama"
      ? `${s.modelId} · Edge mode (laptop over hotspot)`
      : "Keyword rules only (no model loaded)";

  return (
    <Screen title="AI on this phone" subtitle="AI sa phone · nothing leaves your device" back>
      <Card tone="dark">
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-full bg-lime">
            {offline ? <AirplaneTilt size={24} color={C.navy} weight="fill" /> : <Cpu size={24} color={C.navy} weight="fill" />}
          </View>
          <View className="flex-1 gap-[2px]">
            <Text className="font-body-bold text-[17px] text-white">{offline ? "No internet. AI still works." : "Online. AI still runs here."}</Text>
            <Text className="font-body text-[13px] text-haze">{engine}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-2 self-start rounded-full bg-white/10 px-3 py-1">
          {offline ? <AirplaneTilt size={14} color={C.lime} weight="bold" /> : <WifiHigh size={14} color={C.lime} weight="bold" />}
          <Text className="font-body-bold text-[11px] uppercase tracking-wide text-white">Model: {LOAD[s.loadState]}</Text>
        </View>
      </Card>

      <View className="flex-row gap-3">
        <Stat label="Model load" value={s.loadState === "ready" ? secs(s.loadMs) : LOAD[s.loadState]} />
        <Stat label="Avg answer" value={secs(avg)} hint={modelCalls.length ? `${modelCalls.length} model answers` : undefined} />
      </View>
      <View className="flex-row gap-3">
        <Stat label="Tokens / s" value={tps ? String(tps) : "–"} />
        <Stat label="Warm-up" value={s.warmupMs !== undefined ? secs(s.warmupMs) : s.loadState === "ready" && onDevice ? "…" : "–"} hint="Prompt cached at start" />
      </View>

      {s.loadError ? (
        <Card tone="danger">
          <Text className="font-body-bold text-sm text-danger-ink">Load error</Text>
          <Text className="font-body text-[13px] text-danger-ink">{s.loadError}</Text>
        </Card>
      ) : null}

      {canImportModel ? (
        <View className="gap-2">
          <Button label="Pick model file (.gguf)" icon={FileArrowDown} variant="dark" loading={importing} onPress={importModel} />
          {importMsg ? <Text className="text-center font-body text-[13px] text-muted">{importMsg}</Text> : null}
        </View>
      ) : null}

      <Label>Recent AI calls</Label>
      {s.calls.length === 0 ? (
        <EmptyState icon={ChartLine} title="No AI calls yet" hint="Describe a problem on the Book tab, then come back here." />
      ) : (
        <View className="overflow-hidden rounded-3xl border border-border bg-surface">
          {s.calls.map((c, i) => (
            <Animated.View key={c.at} entering={FadeInDown.duration(200)} className={`flex-row items-center gap-3 px-4 py-3 ${i ? "border-t border-border" : ""}`}>
              <View className={`h-2 w-2 rounded-full ${c.source === "model" ? "bg-success" : "bg-amber"}`} />
              <View className="flex-1">
                <Text className="font-body-bold text-[14px] text-ink">{KIND[c.kind]}</Text>
                <Text className="font-body text-xs text-subtle">
                  {c.source === "model" ? "On-device model" : c.source === "fallback" ? "Keyword rules" : "No answer"}
                  {c.attempts > 1 ? ` · ${c.attempts} tries` : ""}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-body-bold text-[14px] text-navy">{secs(c.latencyMs)}</Text>
                {c.tokensPerSecond ? <Text className="font-body text-xs text-subtle">{c.tokensPerSecond} tok/s</Text> : null}
              </View>
            </Animated.View>
          ))}
        </View>
      )}

      {s.modelPath ? <Text className="font-body text-xs text-subtle">File: {s.modelPath}</Text> : null}
      <Button label="Reset stats" icon={ArrowCounterClockwise} variant="ghost" size="sm" onPress={() => aiStats.reset()} />
    </Screen>
  );
}
