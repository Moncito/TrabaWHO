import {
  applyUrgencyFloor,
  BookingCreate,
  buildBookingCard,
  catalog,
  detectHazards,
  getHazard,
  inspectTaskFor,
  SERVICE_CODES,
  tasksForService,
  URGENCIES,
  type BookingCardData,
  type IntakeResult,
  type ServiceCode,
  type TaskCode,
  type Urgency,
} from "@trabawho/shared";
import { randomUUID } from "expo-crypto";
import { router } from "expo-router";
import { CalendarCheck, Clock, LockSimple, MapPin, PencilSimple, Question, Sparkle, X } from "phosphor-react-native";
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { ai } from "@/ai";
import { Screen } from "@/components/Screen";
import { Button, C, Card, Field, HazardAlert, Label, peso, ServiceTile, serviceName, UrgencyBadge } from "@/components/ui";
import { enqueueBooking } from "@/data/bookings";
import { useSession } from "@/data/session";
import { flush, useNetwork } from "@/data/sync";
import { resetDraft, setDraftCard, useDraft } from "@/state/draft";

const toIntake = (c: BookingCardData): IntakeResult => ({
  service: c.service,
  task: c.task,
  urgency: c.urgency,
  hazards: c.hazards,
  summary: c.summary,
  confidence: c.confidence,
});

/** C04–C06 card, S02 fallback, S03 service picker, C07 edit sheet, C08 address + Book. */
export default function BookingCardScreen() {
  const { text, card, editedByUser } = useDraft();
  const user = useSession();
  const { online } = useNetwork();
  const [editing, setEditing] = useState(false);
  const [address, setAddress] = useState("");
  const [barangay, setBarangay] = useState(user?.barangay ?? "");
  const [booking, setBooking] = useState(false);

  // S03: model gave nothing usable -> client picks the service; task = <SERVICE>_INSPECT.
  if (!card) {
    const pick = (service: ServiceCode) => {
      const hazards = detectHazards(text);
      setDraftCard(
        buildBookingCard(
          {
            service,
            task: inspectTaskFor(service),
            urgency: applyUrgencyFloor("SCHEDULED", hazards),
            hazards,
            summary: text.trim().slice(0, 200) || serviceName(service),
            confidence: "low",
          },
          "fallback",
        ),
        true,
      );
    };
    return (
      <Screen title="Pumili ng serbisyo" subtitle="Hindi sigurado ang AI. Anong klaseng trabaho ito?" back>
        {SERVICE_CODES.map((s) => (
          <Pressable key={s} onPress={() => pick(s)} className="active:opacity-80">
            <Card>
              <View className="flex-row items-center gap-3">
                <ServiceTile service={s} />
                <Text className="font-body-bold text-[17px] text-ink">{serviceName(s)}</Text>
              </View>
            </Card>
          </Pressable>
        ))}
      </Screen>
    );
  }

  const minUrgency = applyUrgencyFloor("SCHEDULED", card.hazards);
  const banner = editedByUser ? null : card.source === "fallback" ? "fallback" : card.lowConfidence ? "low" : null;

  async function book() {
    if (!card || !user) return;
    setBooking(true);
    const clientRef = randomUUID();
    const payload = BookingCreate.parse({
      clientRef,
      serviceCode: card.service,
      taskCode: card.task,
      urgency: card.urgency,
      hazards: card.hazards,
      aiSummary: card.summary.slice(0, 200),
      aiConfidence: card.confidence,
      aiModel: ai.modelId.slice(0, 64),
      editedByUser,
      address: address.trim(),
      city: user.city,
      barangay: barangay.trim(),
      createdOffline: !online,
    } satisfies BookingCreate);
    enqueueBooking(user.id, payload);
    // C09 if it sends within ~3 s, otherwise C10 Pending (FLOWS 2). Same path online and offline.
    await Promise.race([flush(), new Promise((r) => setTimeout(r, 3000))]);
    resetDraft();
    setBooking(false);
    router.replace({ pathname: "/booked", params: { ref: clientRef } });
  }

  const sections = [
    banner ? <Banner key="b" kind={banner} /> : null,
    card.safetyNotes.length ? <HazardAlert key="h" notes={card.safetyNotes} showHotline={card.showEmergencyHotline} hotline={card.emergencyHotline} /> : null,
    <Card key="c">
      <View className="flex-row items-center gap-3">
        <ServiceTile service={card.service} />
        <View className="flex-1 gap-1">
          <Text className="font-body-semibold text-[13px] text-muted">{card.serviceNameTl}</Text>
          <Text className="font-body-bold text-[17px] text-ink">{card.taskNameTl}</Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between">
        <UrgencyBadge urgency={card.urgency} />
        <Button label="Edit" icon={PencilSimple} size="sm" variant="ghost" onPress={() => setEditing(true)} />
      </View>
      <View className="gap-1 rounded-xl bg-soft p-3">
        <View className="flex-row items-center gap-1">
          <Sparkle size={14} color={C.lime} weight="fill" />
          <Label>Buod ng AI</Label>
        </View>
        <Text className="font-body text-[15px] leading-[21px] text-ink">{card.summary}</Text>
      </View>
      <View className="flex-row items-end justify-between">
        <View>
          <Label>Tantiyang presyo</Label>
          <Text className="font-headline text-[28px] leading-[32px] text-navy">
            {peso(card.priceMin)}–{peso(card.priceMax).slice(1)}
          </Text>
        </View>
        <View className="flex-row items-center gap-1">
          <Clock size={16} color={C.muted} />
          <Text className="font-body text-[13px] text-muted">
            {card.minutesMin}–{card.minutesMax} min
          </Text>
        </View>
      </View>
      {catalog.pricesAreIllustrative ? <Text className="font-body text-xs text-subtle">Halimbawang presyo lang (illustrative).</Text> : null}
    </Card>,
    card.questions.length ? (
      <Card key="q">
        <Label>Itatanong ng worker</Label>
        {card.questions.map((q) => (
          <View key={q} className="flex-row gap-2">
            <Question size={16} color={C.muted} />
            <Text className="flex-1 font-body text-[15px] text-ink">{q}</Text>
          </View>
        ))}
      </Card>
    ) : null,
    <Card key="a">
      <View className="flex-row items-center gap-1">
        <MapPin size={16} color={C.ink} weight="bold" />
        <Text className="font-body-bold text-[17px] text-ink">Where's the job? · Saan ang trabaho?</Text>
      </View>
      <Field label="Address" placeholder="Hal. 12 Sampaguita St." value={address} onChangeText={setAddress} />
      <Field label="Barangay" value={barangay} onChangeText={setBarangay} />
      <Text className="font-body text-[13px] text-muted">{user?.city}</Text>
    </Card>,
  ].filter(Boolean);

  return (
    <Screen
      title="Your Booking Card"
      subtitle={online ? "Check it, then book" : "Offline: saved on your phone first"}
      back
      footer={
        <Button
          label="Book now"
          icon={CalendarCheck}
          loading={booking}
          onPress={book}
          disabled={!address.trim() || !barangay.trim() || !user}
          disabledReason={!user ? "Mag-login muna" : "Ilagay ang address at barangay"}
        />
      }
    >
      {sections.map((s, i) => (
        // A2: sections reveal in order, hazards first.
        <Animated.View key={i} entering={FadeInDown.duration(250).delay(i * 60)}>
          {s}
        </Animated.View>
      ))}
      <EditSheet
        visible={editing}
        card={card}
        minUrgency={minUrgency}
        onClose={() => setEditing(false)}
        onSave={(v) => {
          setDraftCard(buildBookingCard({ ...toIntake(card), ...v }, card.source), true);
          setEditing(false);
        }}
      />
    </Screen>
  );
}

function Banner({ kind }: { kind: "low" | "fallback" }) {
  return (
    <View className="flex-row gap-2 rounded-xl border border-amber bg-amber-bg p-3">
      <Question size={18} color={C.amberInk} weight="bold" />
      <Text className="flex-1 font-body-semibold text-[13px] text-amber-ink">
        {kind === "low" ? "Hindi sigurado — paki-check ang service" : "Keyword rules ang ginamit (hindi sumagot ang AI). Paki-check ang service."}
      </Text>
    </View>
  );
}

const URGENCY_LABEL: Record<Urgency, string> = { EMERGENCY: "Emergency", TODAY: "Ngayong araw", SCHEDULED: "Naka-schedule" };

/** C07: core Modal sheet. Changing service resets task to <SERVICE>_INSPECT; urgency can't go below the hazard floor. */
function EditSheet({
  visible,
  card,
  minUrgency,
  onClose,
  onSave,
}: {
  visible: boolean;
  card: BookingCardData;
  minUrgency: Urgency;
  onClose: () => void;
  onSave: (v: { service: ServiceCode; task: TaskCode; urgency: Urgency }) => void;
}) {
  const [service, setService] = useState(card.service);
  const [task, setTask] = useState<TaskCode>(card.task);
  const [urgency, setUrgency] = useState(card.urgency);
  const allowed = (u: Urgency) => URGENCIES.indexOf(u) <= URGENCIES.indexOf(minUrgency); // EMERGENCY=0 is highest

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose} onShow={() => (setService(card.service), setTask(card.task), setUrgency(card.urgency))}>
      <Pressable className="flex-1 bg-black/50" onPress={onClose} />
      <View className="max-h-[85%] rounded-t-[28px] bg-surface px-5 pb-6 pt-4" style={{ elevation: 6 }}>
        <View className="flex-row items-center justify-between pb-2">
          <Text className="font-headline text-[22px] text-navy">Baguhin</Text>
          <Pressable accessibilityLabel="Isara" onPress={onClose} className="h-11 w-11 items-center justify-center">
            <X size={22} color={C.ink} weight="bold" />
          </Pressable>
        </View>
        <ScrollView contentContainerClassName="gap-3 pb-4">
          <Label>Serbisyo</Label>
          <View className="flex-row flex-wrap gap-2">
            {SERVICE_CODES.map((s) => (
              <Chip
                key={s}
                label={serviceName(s)}
                selected={s === service}
                onPress={() => {
                  setService(s);
                  setTask(inspectTaskFor(s));
                }}
              />
            ))}
          </View>
          <Label>Trabaho</Label>
          {tasksForService(service).map((t) => (
            <Pressable key={t.code} onPress={() => setTask(t.code)} className={`rounded-[14px] border p-3 ${t.code === task ? "border-2 border-navy bg-info-bg" : "border-border bg-surface"}`}>
              <Text className="font-body-bold text-[15px] text-ink">{t.nameTl}</Text>
              <Text className="font-body text-[13px] text-muted">
                {peso(t.priceMin)}–{peso(t.priceMax).slice(1)} · {t.minutesMin}–{t.minutesMax} min
              </Text>
            </Pressable>
          ))}
          <Label>Gaano kabilis?</Label>
          <View className="flex-row flex-wrap gap-2">
            {URGENCIES.map((u) => (
              <Chip key={u} label={URGENCY_LABEL[u]} selected={u === urgency} disabled={!allowed(u)} onPress={() => setUrgency(u)} />
            ))}
          </View>
          {minUrgency !== "SCHEDULED" ? (
            <View className="flex-row items-center gap-1">
              <LockSimple size={14} color={C.muted} />
              <Text className="flex-1 font-body text-xs text-muted">
                Naka-{URGENCY_LABEL[minUrgency]} dahil may {card.hazards.map((h) => getHazard(h).nameTl.toLowerCase()).join(", ")}
              </Text>
            </View>
          ) : null}
          <Button label="Save changes" variant="dark" onPress={() => onSave({ service, task, urgency })} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function Chip({ label, selected, disabled, onPress }: { label: string; selected?: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      className={`min-h-11 justify-center rounded-full border px-4 ${selected ? "border-navy bg-navy" : "border-border-strong bg-surface"} ${disabled ? "opacity-40" : ""}`}
    >
      <Text className={`font-body-semibold text-[13px] ${selected ? "text-white" : "text-ink"}`}>{label}</Text>
    </Pressable>
  );
}
