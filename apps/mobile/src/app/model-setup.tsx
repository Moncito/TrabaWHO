import { useNetInfo } from "@react-native-community/netinfo";
import { router } from "expo-router";
import { CheckCircle, Cpu, DownloadSimple, FolderOpen, WarningCircle, WifiHigh } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { importModelFromPicker, modelInstalled, reloadModel } from "@/ai";
import { Screen } from "@/components/Screen";
import { Button, C, Card, Label } from "@/components/ui";
import { kvSet } from "@/data/db";
import { useSession } from "@/data/session";

const MODEL_SETUP_SKIPPED = "modelSetupSkipped"; // also read in app/index.tsx

type Phase = "idle" | "downloading" | "loading" | "done" | "error";

/**
 * First-run setup: download the on-device AI model once (SPEC 5.5). After this, every AI feature
 * works in airplane mode. The manual .gguf picker stays as a fallback.
 */
export default function ModelSetup() {
  const user = useSession();
  const net = useNetInfo();
  const [phase, setPhase] = useState<Phase>(modelInstalled() ? "done" : "idle");
  const [bytes, setBytes] = useState(0);
  const [total, setTotal] = useState(-1);
  const [error, setError] = useState<string | null>(null);
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => () => cancelRef.current?.(), []);

  const home = () => router.replace(user?.role === "WORKER" ? "/jobs" : "/new-problem");
  const onCellular = net.type === "cellular";
  const offline = net.isConnected === false;

  async function download() {
    const { startModelDownload } = require("@/ai/modelDownload") as typeof import("@/ai/modelDownload");
    setError(null);
    setBytes(0);
    setTotal(-1);
    setPhase("downloading");
    const task = startModelDownload((p) => {
      setBytes(p.bytes);
      setTotal(p.total);
    });
    cancelRef.current = task.cancel;
    try {
      await task.promise;
      setPhase("loading");
      await reloadModel();
      setPhase("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    } finally {
      cancelRef.current = null;
    }
  }

  async function pickFile() {
    setError(null);
    try {
      setPhase("loading");
      setPhase((await importModelFromPicker()) ? "done" : "idle");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setPhase("error");
    }
  }

  function skip() {
    kvSet(MODEL_SETUP_SKIPPED, true);
    home();
  }

  const mb = (n: number) => `${Math.round(n / 1024 ** 2).toLocaleString("en-PH")} MB`;
  const pct = total > 0 ? Math.min(100, Math.round((bytes / total) * 100)) : null;

  return (
    <Screen
      title="Offline AI setup"
      subtitle="Isang beses lang i-download. Pagkatapos, gumagana kahit walang internet."
      footer={
        phase === "done" ? (
          <Button label="Continue · Tuloy" icon={CheckCircle} onPress={home} />
        ) : phase === "downloading" ? (
          <Button label="Cancel" variant="ghost" onPress={() => cancelRef.current?.()} />
        ) : (
          <View className="gap-2">
            <Button
              label="Download AI (≈1.3 GB)"
              icon={DownloadSimple}
              onPress={download}
              loading={phase === "loading"}
              disabled={offline}
              disabledReason="Kailangan ng internet para sa unang download"
            />
            <Button label="Later · Mamaya na" variant="ghost" onPress={skip} />
          </View>
        )
      }
    >
      <Card>
        <View className="flex-row items-center gap-3">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-navy">
            <Cpu size={26} color={C.lime} weight="bold" />
          </View>
          <View className="flex-1">
            <Text className="font-body-bold text-[17px] text-ink">Qwen3 1.7B, runs on this phone</Text>
            <Text className="font-body text-[13px] text-muted">Your problem descriptions never leave the phone.</Text>
          </View>
        </View>
        <Label>What the AI does offline</Label>
        <Text className="font-body text-[15px] leading-[22px] text-ink">
          Understands your problem in Taglish, picks the right worker, writes job reports, checks messages for scams and gives first-aid steps while you wait.
        </Text>
      </Card>

      {phase === "idle" || phase === "error" ? (
        <Card>
          <View className="flex-row items-center gap-2">
            {onCellular ? <WarningCircle size={18} color={C.amberInk} weight="fill" /> : <WifiHigh size={18} color={C.ok} weight="bold" />}
            <Text className="flex-1 font-body text-[14px] text-ink">
              {onCellular ? "Naka-mobile data ka. Mas mabuti ang Wi-Fi: ≈1.3 GB ang download." : "Gamitin ang Wi-Fi. Kailangan ng ≈1.6 GB na libreng space."}
            </Text>
          </View>
          {error ? <Text className="font-body-semibold text-[14px] text-danger">{error}</Text> : null}
        </Card>
      ) : null}

      {phase === "downloading" ? (
        <Card>
          <Label>Downloading · Dina-download</Label>
          <View className="h-3 overflow-hidden rounded-full bg-soft">
            <View className="h-3 rounded-full bg-lime" style={{ width: `${pct ?? 5}%` }} />
          </View>
          <Text className="font-body text-[14px] text-muted">
            {pct !== null ? `${pct}% · ${mb(bytes)} of ${mb(total)}` : `${mb(bytes)} downloaded`}
          </Text>
          <Text className="font-body text-xs text-subtle">Keep the app open. You can keep using your phone.</Text>
        </Card>
      ) : null}

      {phase === "loading" ? (
        <Card>
          <Text className="font-body text-[15px] text-ink">Loading the AI on your phone...</Text>
        </Card>
      ) : null}

      {phase === "done" ? (
        <Animated.View entering={FadeIn.duration(300)}>
          <Card>
            <View className="flex-row items-center gap-2">
              <CheckCircle size={22} color={C.ok} weight="fill" />
              <Text className="flex-1 font-body-bold text-[16px] text-ink">Offline AI is ready. Pwede nang mag-airplane mode.</Text>
            </View>
          </Card>
        </Animated.View>
      ) : null}

      {phase === "idle" || phase === "error" ? (
        <Button label="I already have the .gguf file" icon={FolderOpen} variant="ghost" size="sm" onPress={pickFile} />
      ) : null}
    </Screen>
  );
}
