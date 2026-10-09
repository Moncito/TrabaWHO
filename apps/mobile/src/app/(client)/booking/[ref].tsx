import { BOOKING_STATUSES, safetyFor, type BookingCreate, type BookingStatus, type Urgency } from "@trabawho/shared";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowRight, CaretRight, Check, CheckCircle, Handshake, MagnifyingGlass, Phone, Quotes, Wrench, X, type Icon } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { Note, Screen } from "@/components/Screen";
import { Avatar, Button, C, call, HazardAlert, InfoRows, Label, peso, serviceNameEn, StatusBadge, taskNameEn, TotalsCard, VerifiedBadge } from "@/components/ui";
import { cancelInfo, refreshMine, uiStatus, useCachedBookings, useOutbox, type UiStatus } from "@/data/bookings";
import { useDbVersion } from "@/data/db";
import { useSession } from "@/data/session";
import { useNetwork, usePolling } from "@/data/sync";

const WHEN: Record<Urgency, string> = { EMERGENCY: "Emergency", TODAY: "Today", SCHEDULED: "Scheduled" };
const time = (ms: number) => new Date(ms).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit", hour12: false });

/** Artboards B2 (progress + cancel) and B4 (cancelled). Looked up by clientRef so Pending items open too. */
export default function BookingDetail() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const user = useSession();
  const { online } = useNetwork();
  useDbVersion(); // re-read the cancel note after a cancel
  const server = useCachedBookings().find((b) => b.clientRef === ref);
  const row = useOutbox().find((r) => r.id === ref);
  usePolling(() => (user ? refreshMine() : Promise.resolve()), online && !!user);

  const p = row ? (JSON.parse(row.payload) as BookingCreate) : null;
  const cancelled = ref ? cancelInfo(ref) : null;
  const local = p ?? cancelled?.booking;
  const b = server ?? (local && { ...local, hazards: p?.hazards ?? [], aiSummary: p?.aiSummary ?? "" });
  if (!b) {
    return (
      <Screen title="Booking" back>
        <Note>We couldn't find this booking. Hindi makita ang booking.</Note>
      </Screen>
    );
  }
  const status: UiStatus = server ? uiStatus(server, row) : row ? uiStatus(null, row) : "CANCELLED";
  const title = taskNameEn(b.taskCode);
  const subtitle = `${serviceNameEn(b.serviceCode)} · ${b.barangay}`;

  if (status === "CANCELLED") {
    return (
      <Screen title={title} subtitle={subtitle} back footer={<Button label="Book again" onPress={() => router.navigate("/new-problem")} />}>
        <View className="items-center gap-[10px] pt-4">
          <Animated.View entering={ZoomIn.springify()} className="h-[88px] w-[88px] items-center justify-center rounded-full border-[10px] border-surface bg-danger-bg">
            <X size={40} color={C.dangerInk} weight="bold" />
          </Animated.View>
          <StatusBadge status="CANCELLED" />
          <Text className="font-headline text-[22px] leading-[28px] text-navy">Booking cancelled</Text>
          <Text className="max-w-[300px] text-center font-body text-[15px] leading-[22px] text-muted">
            {server ? "Nearby workers were told. No fee was charged." : "It never left your phone, so no worker saw it. No fee."}
          </Text>
        </View>
        <InfoRows
          rows={[
            { label: "Reason", value: cancelled?.reason ?? "Cancelled" },
            ...(cancelled ? [{ label: "Cancelled", value: `Today, ${time(cancelled.at)}` }] : []),
            { label: "Fee", value: <Text className="font-body-bold text-[14px] text-ok">₱0</Text> },
          ]}
        />
      </Screen>
    );
  }

  const canCancel = status === "PENDING" || status === "FAILED" || (status === "REQUESTED" && !server?.workerId);
  const worker = server?.worker;
  const sentAt = server ? Date.parse(server.createdAt) : row?.createdAt;

  return (
    <Screen
      title={title}
      subtitle={subtitle}
      back
      footer={
        canCancel ? (
          <>
            <Button label="Cancel booking" icon={X} variant="dangerOutline" onPress={() => router.push({ pathname: "/cancel-booking", params: { ref: ref! } })} disabled={!!server && !online} disabledReason={server && !online ? "Cancelling a sent booking needs internet." : undefined} />
            {server && !online ? null : <Text className="text-center font-body text-xs text-subtle">Free to cancel until a worker accepts.</Text>}
          </>
        ) : undefined
      }
    >
      <Animated.View entering={FadeInDown.duration(250)} className="rounded-3xl border border-border bg-surface p-4">
        <View className="flex-row items-center justify-between pb-3">
          <Label>Progress</Label>
          <StatusBadge status={status} />
        </View>
        <Timeline status={server?.status} sentAt={server ? sentAt : undefined} />
      </Animated.View>

      {worker ? (
        <Animated.View entering={FadeInDown.delay(80).duration(250)} className="gap-3 rounded-3xl bg-navy p-4">
          <Pressable accessibilityRole="link" accessibilityLabel={`View ${worker.name}'s profile`} onPress={() => router.push({ pathname: "/worker/[id]", params: { id: worker.id } })} className="flex-row items-center gap-3 active:opacity-80">
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
      ) : null}

      {!server ? (
        <View className="flex-row items-center gap-3 rounded-3xl border-[1.5px] border-dashed border-amber bg-amber-bg p-4">
          <ArrowRight size={18} color={C.amberInk} weight="bold" />
          <Text className="flex-1 font-body-bold text-[13px] text-amber-ink">
            {status === "FAILED" ? "Couldn't send yet. We'll retry automatically." : "Saved on your phone. It sends itself when you're back online."}
          </Text>
        </View>
      ) : null}

      <HazardAlert notes={safetyFor(b.hazards).safetyNotes} compact />

      <InfoRows
        rows={[
          { label: "Address", value: `${b.address}, ${b.barangay}` },
          { label: "When", value: WHEN[b.urgency] },
          ...(server ? [{ label: "Estimate", value: `${peso(server.priceMin)}–${peso(server.priceMax).slice(1)}`, strong: true }] : []),
        ]}
      />

      {b.aiSummary ? (
        <View className="flex-row gap-3 rounded-3xl border border-border bg-surface p-4">
          <Quotes size={20} color={C.lime} weight="fill" />
          <View className="flex-1 gap-1">
            <Label>AI summary</Label>
            <Text className="font-body text-[15px] leading-[22px] text-ink">{b.aiSummary}</Text>
          </View>
        </View>
      ) : null}

      {server?.report ? <TotalsCard {...server.report} /> : null}
    </Screen>
  );
}

const STEPS: { label: string; hint: string; icon: Icon }[] = [
  { label: "Request sent", hint: "Saved on your phone. Sends when you're online.", icon: Check },
  { label: "Finding a worker", hint: "Looking near you. You'll see their name here.", icon: MagnifyingGlass },
  { label: "Accepted", hint: "Your worker is on the way.", icon: Handshake },
  { label: "Job in progress", hint: "Your worker is fixing it now.", icon: Wrench },
  { label: "Done · pay cash", hint: "Pay in cash after the job.", icon: CheckCircle },
];

/** Vertical stepper with rails (artboard B2): done = navy check, current = amber icon + hint. */
function Timeline({ status, sentAt }: { status?: BookingStatus; sentAt?: number }) {
  const current = status ? BOOKING_STATUSES.indexOf(status as (typeof BOOKING_STATUSES)[number]) + 1 : 0;
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
                <Animated.View entering={ZoomIn.springify()} className="h-7 w-7 items-center justify-center rounded-full border-4 border-amber-bg bg-lime">
                  <I size={13} color={C.navy} weight="bold" />
                </Animated.View>
              ) : (
                <View className="h-7 w-7 rounded-full border-2 border-border-strong bg-surface" />
              )}
              {last ? null : <View className={`w-[2px] flex-1 ${done ? "bg-navy" : "bg-border"}`} style={{ minHeight: 12 }} />}
            </View>
            <View className={`flex-1 ${last ? "" : "pb-3"}`}>
              <View className="flex-row items-start justify-between gap-2 pt-1">
                <Text className={`text-[15px] ${now || done ? "font-body-bold text-ink" : "font-body text-muted"}`}>{s.label}</Text>
                {i === 0 && sentAt ? <Text className="font-body text-xs text-subtle">{time(sentAt)}</Text> : null}
              </View>
              {now ? <Text className="font-body text-[13px] leading-[18px] text-muted">{s.hint}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
