import { computeReportTotals, ReportCreate, type ReportDraft } from "@trabawho/shared";
import { randomUUID } from "expo-crypto";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle, CloudArrowUp, FloppyDisk, Plus, Sparkle, Trash } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { ai } from "@/ai";
import { Note, Screen } from "@/components/Screen";
import { Button, C, Card, Field, Label, peso, taskName, TotalsCard } from "@/components/ui";
import { enqueueReport, useCachedBookings, useOutbox } from "@/data/bookings";
import { useSession } from "@/data/session";
import { flush, useNetwork } from "@/data/sync";

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
  const [savedRef, setSavedRef] = useState<string | null>(null);
  const saved = useOutbox().find((r) => r.id === savedRef);

  if (!b || !user) {
    return (
      <Screen title="I-report" back>
        <Note>Hindi makita ang trabaho.</Note>
      </Screen>
    );
  }

  async function extract() {
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
    setBusy(true);
    const clientRef = randomUUID();
    const payload = ReportCreate.parse({
      clientRef,
      bookingId: b!.id,
      tasksDone: draft.tasksDone,
      materials: priced,
      durationMinutes: draft.durationMinutes,
      notes: draft.notes.slice(0, 300),
      createdOffline: !online,
    } satisfies ReportCreate);
    enqueueReport(user!.id, b!.id, payload);
    setSavedRef(clientRef);
    await Promise.race([flush(), new Promise((r) => setTimeout(r, 3000))]);
    setBusy(false);
  }

  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  // W05
  if (savedRef && totals) {
    const sent = saved?.status === "sent";
    return (
      <Screen title={sent ? "Naipadala!" : "Naka-save!"} footer={<Button label="Bumalik sa jobs" onPress={() => router.replace("/jobs")} />}>
        <View className="items-center gap-3 py-6">
          <Animated.View key={String(sent)} entering={ZoomIn.springify()} className={`h-28 w-28 items-center justify-center rounded-full ${sent ? "bg-lime" : "border-2 border-dashed border-subtle bg-surface"}`}>
            {sent ? <CheckCircle size={56} color={C.ink} weight="fill" /> : <CloudArrowUp size={56} color={C.ink} weight="bold" />}
          </Animated.View>
          <Text className="text-center font-body-semibold text-[15px] text-ink">
            {sent ? "Tapos na ang booking." : saved?.status === "failed" ? "Hindi pa naipapadala — susubukan ulit" : "Pending — ipapadala pag may internet"}
          </Text>
        </View>
        <TotalsCard {...totals} />
      </Screen>
    );
  }

  // W03
  if (!draft) {
    return (
      <Screen
        title="I-report ang trabaho"
        subtitle={taskName(b.taskCode)}
        back
        footer={<Button label="Gawing report" icon={Sparkle} loading={busy} onPress={extract} disabled={!text.trim()} />}
      >
        <Field
          label="Ano ang ginawa mo?"
          multiline
          placeholder="Hal. Pinalitan ko yung outlet, gumamit ng isang outlet tsaka dalawang metro ng wire, 45 minutes."
          value={text}
          onChangeText={setText}
        />
        <Text className="font-body text-xs text-subtle">AI sa phone ang gagawa ng listahan. Ikaw ang maglalagay ng presyo.</Text>
      </Screen>
    );
  }

  // W04
  return (
    <Screen
      title="I-check ang report"
      back
      footer={<Button label="I-save ang report" icon={FloppyDisk} loading={busy} onPress={save} disabled={!rowsValid} disabledReason="Lagyan ng presyo ang bawat materyales (0 kung wala)" />}
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
        <Label>Materyales (ikaw ang mag-presyo)</Label>
        {rows.length === 0 ? <Text className="font-body text-[13px] text-muted">Walang materyales na nabanggit.</Text> : null}
        {rows.map((r, i) => {
          const amount = toInt(r.price) * Number(r.qty);
          return (
            <View key={i} className="gap-2 border-b border-border pb-2">
              <View className="flex-row items-center gap-2">
                <TextInput value={r.name} onChangeText={(name) => set(i, { name })} placeholder="Item" className="h-10 flex-1 rounded-lg border border-border-strong px-2 py-0 font-body text-[15px] text-ink" />
                <Pressable accessibilityLabel="Tanggalin" onPress={() => setRows((rs) => rs.filter((_, j) => j !== i))} className="h-10 w-10 items-center justify-center">
                  <Trash size={20} color={C.danger} />
                </Pressable>
              </View>
              <View className="flex-row items-center gap-2">
                <TextInput value={r.qty} onChangeText={(qty) => set(i, { qty })} keyboardType="decimal-pad" className="h-10 w-16 rounded-lg border border-border-strong px-2 py-0 text-center font-body text-[15px] text-ink" />
                <Text className="w-8 font-body text-[13px] text-muted">{r.unit}</Text>
                <Text className="font-body text-[13px] text-muted">× ₱</Text>
                <TextInput
                  value={r.price}
                  onChangeText={(price) => set(i, { price })}
                  keyboardType="number-pad"
                  placeholder="presyo"
                  className={`h-10 flex-1 rounded-lg border px-2 py-0 font-body text-[15px] text-ink ${Number.isFinite(toInt(r.price)) ? "border-border-strong" : "border-amber bg-amber-bg"}`}
                />
                <Text className="w-20 text-right font-body-bold text-sm text-ink">{Number.isFinite(amount) ? peso(amount) : "-"}</Text>
              </View>
            </View>
          );
        })}
        <Button label="Magdagdag ng materyales" icon={Plus} size="sm" variant="ghost" onPress={() => setRows((rs) => [...rs, { name: "", qty: "1", unit: "pc", price: "" }])} />
      </Card>
      {totals ? <TotalsCard {...totals} /> : null}
    </Screen>
  );
}
