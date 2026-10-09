import { BOOKING_STATUSES, safetyFor, type BookingCreate, type BookingStatus, type Urgency } from "@trabawho/shared";
import { router, useLocalSearchParams } from "expo-router";
import { CaretRight, Check, CheckCircle, CloudArrowUp, Handshake, MagnifyingGlass, Phone, Quotes, Wrench, type Icon } from "phosphor-react-native";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming, ZoomIn } from "react-native-reanimated";

import { Note, Screen } from "@/components/Screen";
import { Avatar, Button, C, call, HazardAlert, InfoRows, Label, peso, ServiceTile, serviceNameEn, StatusBadge, taskNameEn, TotalsCard, VerifiedBadge } from "@/components/ui";
import { refreshMine, uiStatus, useCachedBookings, useOutbox } from "@/data/bookings";
import { useSession } from "@/data/session";
import { useNetwork, usePolling } from "@/data/sync";

const URGENCY_EN: Record<Urgency, string> = { EMERGENCY: "Emergency", TODAY: "Today", SCHEDULED: "Scheduled" };

/** C12 (artboard V20): detail by clientRef so Pending items open too. */
export default function BookingDetail() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const user = useSession();
  const { online } = useNetwork();
  const server = useCachedBookings().find((b) => b.clientRef === ref);
  const row = useOutbox().find((r) => r.id === ref);
  usePolling(() => (user ? refreshMine() : Promise.resolve()), online && !!user);

  const p = row ? (JSON.parse(row.payload) as BookingCreate) : null;
  const b = server ?? (p && { serviceCode: p.serviceCode, taskCode: p.taskCode, urgency: p.urgency, hazards: p.hazards, aiSummary: p.aiSummary, address: p.address, barangay: p.barangay, priceMin: 0, priceMax: 0 });
  if (!b) {
    return (
      <Screen title="Booking" back>
        <Note>We couldn't find this booking. Hindi makita ang booking.</Note>
      </Screen>
    );
  }
  const status = uiStatus(server, row);
  const safety = safetyFor(b.hazards);
  const worker = server?.worker;
  const openWorker = () => worker && router.push({ pathname: "/worker/[id]", params: { id: worker.id } });

  return (
    <Screen title={taskNameEn(b.taskCode)} subtitle={`${serviceNameEn(b.serviceCode)} · ${b.barangay}`} back>
      <Animated.View entering={FadeInDown.duration(250)} className="gap-4 rounded-3xl border border-border bg-surface p-4">
        <View className="flex-row items-center gap-3">
          <ServiceTile service={b.serviceCode} />
          <View className="flex-1">
            <Label>Progress</Label>
            <Text className="font-body-bold text-[17px] text-ink">{HEADLINE[status] ?? "Booking"}</Text>
          </View>
          <StatusBadge status={status} />
        </View>
        <Timeline status={server?.status} pending={!server} />
      </Animated.View>

      {worker ? (
        <Animated.View entering={FadeInDown.delay(80).duration(250)} className="gap-3 rounded-3xl bg-navy p-4">
          <Pressable accessibilityRole="link" accessibilityLabel={`View ${worker.name}'s profile`} onPress={openWorker} className="flex-row items-center gap-3 active:opacity-80">
            <Avatar name={worker.name} size={52} tone="amber" />
            <View className="flex-1 gap-1">
              <Text className="font-body-bold text-[17px] text-white">{worker.name}</Text>
              <Text className="font-body text-[13px] text-haze">Your {serviceNameEn(b.serviceCode).toLowerCase()} · view profile</Text>
            </View>
            <CaretRight size={20} color={C.haze} weight="bold" />
          </Pressable>
          {worker.isVerified === true ? <VerifiedBadge /> : null}
          <Button label={`Call ${worker.name.split(" ")[0]}`} icon={Phone} onPress={() => call(worker.phone)} />
        </Animated.View>
      ) : status === "REQUESTED" ? (
        <Searching />
      ) : null}

      <HazardAlert notes={safety.safetyNotes} compact />

      <InfoRows
        rows={[
          { label: "Job", value: taskNameEn(b.taskCode) },
          { label: "Address", value: `${b.address}, ${b.barangay}` },
          { label: "When", value: URGENCY_EN[b.urgency] },
          ...(server ? [{ label: "Estimate", value: `${peso(server.priceMin)}–${peso(server.priceMax).slice(1)}`, strong: true }] : []),
        ]}
      />

      <View className="flex-row gap-3 rounded-3xl border border-border bg-surface p-4">
        <Quotes size={20} color={C.lime} weight="fill" />
        <View className="flex-1 gap-1">
          <Label>AI summary</Label>
          <Text className="font-body text-[15px] leading-[22px] text-ink">{b.aiSummary}</Text>
        </View>
      </View>

      {server?.report ? <TotalsCard {...server.report} /> : null}
    </Screen>
  );
}

const HEADLINE: Partial<Record<string, string>> = {
  PENDING: "Saved on your phone",
  FAILED: "Not sent yet",
  REQUESTED: "Finding you a worker",
  ACCEPTED: "A worker accepted",
  IN_PROGRESS: "Work in progress",
  COMPLETED: "Job done",
  CANCELLED: "Cancelled",
};

const STEPS: { label: string; hint: string; icon: Icon }[] = [
  { label: "Request sent", hint: "Naipadala", icon: CloudArrowUp },
  { label: "Finding a worker", hint: "Hinahanapan", icon: MagnifyingGlass },
  { label: "Accepted", hint: "Tinanggap", icon: Handshake },
  { label: "Job in progress", hint: "Ginagawa", icon: Wrench },
  { label: "Done · pay cash", hint: "Tapos na", icon: CheckCircle },
];

/** Vertical stepper with rails (artboard V20): done = navy check, current = amber icon. */
function Timeline({ status, pending }: { status?: BookingStatus; pending: boolean }) {
  const current = pending ? 0 : status ? BOOKING_STATUSES.indexOf(status as (typeof BOOKING_STATUSES)[number]) + 1 : 0;
  const allDone = status === "COMPLETED";
  return (
    <View>
      {STEPS.map((s, i) => {
        const done = i < current || (allDone && i === current);
        const now = i === current && !allDone;
        const I = s.icon;
        const last = i === STEPS.length - 1;
        return (
          <View key={s.label} className="flex-row gap-3">
            <View className="w-7 items-center">
              {done ? (
                <View className="h-7 w-7 items-center justify-center rounded-full bg-navy">
                  <Check size={14} color={C.white} weight="bold" />
                </View>
              ) : now ? (
                <Animated.View entering={ZoomIn.springify()} className="h-7 w-7 items-center justify-center rounded-full bg-lime">
                  <I size={15} color={C.navy} weight="fill" />
                </Animated.View>
              ) : (
                <View className="h-7 w-7 rounded-full border-2 border-border-strong bg-surface" />
              )}
              {last ? null : <View className={`w-[2px] flex-1 ${done ? "bg-navy" : "bg-border"}`} style={{ minHeight: 14 }} />}
            </View>
            <View className={`flex-1 flex-row items-start justify-between ${last ? "" : "pb-3"}`}>
              <Text className={`pt-1 text-[15px] ${now ? "font-body-bold text-ink" : done ? "font-body text-ink" : "font-body text-subtle"}`}>{s.label}</Text>
              <Text className="pt-1 font-body text-xs text-subtle">{s.hint}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

/** Live "looking for a worker" card while REQUESTED, so the screen never feels idle. */
function Searching() {
  const reduced = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    if (!reduced) o.value = withRepeat(withSequence(withTiming(0.3, { duration: 700 }), withTiming(1, { duration: 700 })), -1);
  }, [reduced, o]);
  const dot = useAnimatedStyle(() => ({ opacity: o.value }));
  return (
    <Animated.View entering={FadeInDown.delay(80).duration(250)} className="flex-row items-center gap-3 rounded-3xl border-[1.5px] border-dashed border-amber bg-amber-bg p-4">
      <Animated.View style={dot} className="h-3 w-3 rounded-full bg-lime" />
      <View className="flex-1">
        <Text className="font-body-bold text-[15px] text-navy">Looking for a worker near you</Text>
        <Text className="font-body text-[13px] text-amber-ink">You'll see their name and number here once they accept.</Text>
      </View>
    </Animated.View>
  );
}
