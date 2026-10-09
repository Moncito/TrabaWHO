import { checkReportText, computeReportTotals, MAX_INPUT_CHARS, ReportCreate, type ReportDraft } from "@trabawho/shared";
import { randomUUID } from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle, CloudArrowUp, FloppyDisk, Plus, Sparkle, Trash, WarningCircle } from "phosphor-react-native";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { ai, useAiStats } from "@/ai";
import { Note, Screen } from "@/components/Screen";
import { Button, C, Card, Field, Label, peso, StatusHero, taskName, TotalsCard } from "@/components/ui";
import { enqueueReport, useCachedBookings, useOutbox } from "@/data/bookings";
import { useSession } from "@/data/session";
import { flush, useNetwork } from "@/data/sync";
import { showToast } from "@/state/toast";

interface Row {
  name: string;
  qty: string;
  unit: string;
  price: string;
}

const toInt = (s: string) => (/^\d+$/.test(s.trim()) ? Number(s.trim()) : NaN);

/** W03 input → W04 review (worker types prices) → W05 saved/pending. */
export default function Report() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const user = useSession();
  const { online } = useNetwork();
  const b = useCachedBookings().find((x) => x.id === bookingId);
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<ReportDraft | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [savedRef, setSavedRef] = useState<string | null>(null);
  const saved = useOutbox().find((r) => r.id === savedRef);
  const { backend } = useAiStats();
  // Pre-process the report prompt while the worker types (the cache usually holds the intake prompt).
  useEffect(() => {
    if (b) void ai.prewarm?.("report", b.taskCode);
  }, [b?.taskCode]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!b || !user) {
    return (
      <Screen title="Report" back>
        <Note>We couldn't find this job. Hindi makita ang trabaho.</Note>
      </Screen>
    );
  }

  async function extract() {
    const check = checkReportText(text);
    if (!check.ok) return setProblem(check.message);
    setBusy(true);
    try {
      const d = await ai.extractReport(text.trim(), b!.taskCode);
      setDraft(d);
      setRows(d.materials.map((m) => ({ name: m.name, qty: String(m.qty), unit: m.unit, price: "" })));
    } finally {
      setBusy(false);
    }
  }

  // Totals come only from computeReportTotals() (shared with the API, which recomputes on save).
  const priced = rows.map((r) => ({ name: r.name.trim(), qty: Number(r.qty), unit: r.unit.trim() || "pc", unitPrice: toInt(r.price) }));
  const rowsValid = priced.every((m) => m.name && m.qty > 0 && Number.isFinite(m.unitPrice));
  const totals = draft ? computeReportTotals(draft.tasksDone, priced.map((m) => ({ qty: m.qty || 0, unitPrice: m.unitPrice || 0 }))) : null;

  async function save() {
    if (!draft) return;
    const clientRef = randomUUID();
    const parsed = ReportCreate.safeParse({
      clientRef,
      bookingId: b!.id,
      tasksDone: draft.tasksDone,
      materials: priced,
      durationMinutes: draft.durationMinutes,
      notes: draft.notes.slice(0, 300),
      createdOffline: !online,
    } satisfies ReportCreate);
    if (!parsed.success) return showToast("error", "May mali sa report (hal. pangalan ng materyales lampas 80 letra).");
    setBusy(true);
    enqueueReport(user!.id, b!.id, parsed.data);
    setSavedRef(clientRef);
    await Promise.race([flush(), new Promise((r) => setTimeout(r, 3000))]);
    setBusy(false);
  }

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  // W05
  if (savedRef && totals) {
    const sent = saved?.status === "sent";
    return (
      <Screen title="Report" footer={<Button label="Back to jobs" variant="dark" onPress={() => router.replace("/jobs")} />}>
        {sent ? (
          <StatusHero kind="sent" icon={CheckCircle} title="Report sent!" message="The booking is now complete. Tapos na ang booking." />
        ) : saved?.status === "failed" ? (
          <StatusHero kind="failed" icon={WarningCircle} title="Not sent yet" message="We'll retry automatically. Susubukan ulit." />
        ) : (
          <StatusHero kind="pending" icon={CloudArrowUp} title="Report saved!" message="Sends itself when you're back online. Ipapadala pag may internet." />
        )}
        <TotalsCard {...totals} />
      </Screen>
    );
  }

  // W03
  if (!draft) {
    return (
      <Screen
        title="Report the job"
        subtitle={`${taskName(b.taskCode)} · I-report ang trabaho`}
        back
        footer={<Button label="Make my report" icon={Sparkle} loading={busy} onPress={extract} disabled={!text.trim()} />}
      >
        <Field
          label="What did you do? · Ano ang ginawa mo?"
          multiline
          placeholder="Hal. Pinalitan ko yung outlet, gumamit ng isang outlet tsaka dalawang metro ng wire, 45 minutes."
          value={text}
          onChangeText={(t) => {
            setText(t);
            setProblem(null);
          }}
          maxLength={MAX_INPUT_CHARS}
        />
        {problem ? (
          <View accessibilityLiveRegion="polite" className="flex-row items-start gap-2 rounded-2xl bg-amber-bg px-3 py-[10px]">
            <WarningCircle size={18} color={C.amberInk} weight="fill" />
            <Text className="flex-1 font-body-bold text-[13px] leading-[18px] text-amber-ink">{problem}</Text>
          </View>
        ) : (
          <Text className="font-body text-xs text-subtle">
            {backend === "llama" ? "AI sa phone" : backend === "ollama" ? "AI sa laptop (Edge mode)" : "Keyword rules"} ang gagawa ng listahan. Ikaw ang maglalagay ng presyo.
          </Text>
        )}
      </Screen>
    );
  }

  // W04
  return (
    <Screen
      title="Check your report"
      subtitle="I-check ang report"
      back
      footer={<Button label="Save report" variant="dark" icon={FloppyDisk} loading={busy} onPress={save} disabled={!rowsValid} disabledReason="Add a price for each material (0 if none)" />}
    >
      <Card>
        <Label>Ginawa</Label>
        {draft.tasksDone.map((t) => (
          <Text key={t} className="font-body-bold text-[15px] text-ink">
            • {taskName(t)}
          </Text>
        ))}
        <Text className="font-body text-[13px] text-muted">
          {draft.durationMinutes} minuto{draft.notes ? ` · ${draft.notes}` : ""}
        </Text>
      </Card>
      <Card>
        <Label>Materials (you set the price)</Label>
        {rows.length === 0 ? <Text className="font-body text-[13px] text-muted">No materials mentioned.</Text> : null}
        {rows.map((r, i) => {
          const amount = toInt(r.price) * Number(r.qty);
          return (
            <View key={i} className="gap-2 border-b border-border pb-2">
              <View className="flex-row items-center gap-2">
                <TextInput value={r.name} onChangeText={(name) => set(i, { name })} placeholder="Item" className="h-11 flex-1 rounded-xl border border-border-strong px-3 py-0 font-body text-[15px] text-ink" />
                <Pressable accessibilityLabel="Tanggalin" onPress={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="h-10 w-10 items-center justify-center">
                  <Trash size={20} color={C.danger} />
                </Pressable>
              </View>
              <View className="flex-row items-center gap-2">
                <TextInput value={r.qty} onChangeText={(qty) => set(i, { qty })} keyboardType="decimal-pad" className="h-11 w-16 rounded-xl border border-border-strong px-2 py-0 text-center font-body text-[15px] text-ink" />
                <Text className="w-8 font-body text-[13px] text-muted">{r.unit}</Text>
                <Text className="font-body text-[13px] text-muted">× ₱</Text>
                <TextInput
                  value={r.price}
                  onChangeText={(price) => set(i, { price })}
                  keyboardType="number-pad"
                  placeholder="presyo"
                  className={`h-11 flex-1 rounded-xl border px-3 py-0 font-body text-[15px] text-ink ${Number.isFinite(toInt(r.price)) ? "border-border-strong" : "border-amber bg-amber-bg"}`}
                />
                <Text className="w-20 text-right font-body-bold text-sm text-navy">{Number.isFinite(amount) ? peso(amount) : "-"}</Text>
              </View>
            </View>
          );
        })}
        <Button label="Add material" icon={Plus} size="sm" variant="ghost" onPress={() => setRows((rs) => [...rs, { name: "", qty: "1", unit: "pc", price: "" }])} />
      </Card>
      {totals ? <TotalsCard {...totals} /> : null}
    </Screen>
  );
}
