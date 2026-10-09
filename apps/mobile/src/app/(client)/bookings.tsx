import type { BookingCreate, ServiceCode, TaskCode, Urgency } from "@trabawho/shared";

const WHEN: Record<Urgency, string> = { EMERGENCY: "Emergency", TODAY: "Today", SCHEDULED: "Scheduled" };
const LINE: Partial<Record<UiStatus, string>> = {
  REQUESTED: "Finding you a worker…",
  ACCEPTED: "A worker accepted your job",
  IN_PROGRESS: "Work in progress",
  COMPLETED: "Done · paid in cash",
};
import { router } from "expo-router";
import { ArrowsClockwise, CaretRight, ListBullets, Plus } from "phosphor-react-native";
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AccountButtons } from "@/components/AccountButtons";
import { GuestAccountPrompt } from "@/components/GuestAccountPrompt";
import { Screen } from "@/components/Screen";
import { Button, C, EmptyState, ServiceTile, serviceNameEn, StatusBadge, taskNameEn } from "@/components/ui";
import { refreshMine, uiStatus, useCachedBookings, useOutbox, type UiStatus } from "@/data/bookings";
import { useGuest, useSession } from "@/data/session";
import { retry, useNetwork, usePolling } from "@/data/sync";

interface Row {
  ref: string;
  service: ServiceCode;
  task: TaskCode;
  urgency: Urgency;
  place: string;
  status: UiStatus;
  createdAt: number;
  outboxId?: string;
}

/** C11: bookings_cache ∪ unsynced outbox rows, polled every 5 s while online. */
export default function Bookings() {
  const user = useSession();
  const guest = useGuest();
  const { online } = useNetwork();
  const outbox = useOutbox();
  const cache = useCachedBookings();
  usePolling(() => (user ? refreshMine() : Promise.resolve()), online && !!user);

  const mine = cache.filter((b) => b.clientId === user?.id);
  const synced = new Set(mine.map((b) => b.clientRef));
  const rows: Row[] = [
    ...outbox
      .filter((r) => r.type === "BOOKING_CREATE" && r.userId === user?.id && !synced.has(r.id))
      .map((r) => {
        const p = JSON.parse(r.payload) as BookingCreate;
        return { ref: r.id, service: p.serviceCode, task: p.taskCode, urgency: p.urgency, place: `${p.address}, ${p.barangay}`, status: uiStatus(null, r), createdAt: r.createdAt, outboxId: r.id };
      }),
    ...mine.map((b) => ({ ref: b.clientRef, service: b.serviceCode, task: b.taskCode, urgency: b.urgency, place: `${b.address}, ${b.barangay}`, status: b.status, createdAt: Date.parse(b.createdAt) })),
  ].sort((a, b) => b.createdAt - a.createdAt);

  const [tab, setTab] = useState<"active" | "done">("active");
  const isDone = (r: Row) => r.status === "COMPLETED" || r.status === "CANCELLED";
  const done = rows.filter(isDone);
  const active = rows.filter((r) => !isDone(r));
  const shown = tab === "active" ? active : done;

  // Guests (no account) can't book, so "Book a worker" would only loop back to the AI screen.
  if (guest) {
    return (
      <Screen title="My bookings" subtitle="Guest mode" right={<AccountButtons />}>
        <GuestAccountPrompt
          icon={ListBullets}
          title="Bookings need an account"
          body="You're trying TrabaWHO as a guest: the AI works offline on this phone. To send a booking to a worker and track it here, sign up or log in. Kailangan ng account para mag-book."
        />
      </Screen>
    );
  }

  return (
    <Screen title="My bookings" subtitle={user?.name} right={<AccountButtons />}>
      {rows.length ? (
        <View className="flex-row rounded-full border border-border bg-surface p-1">
          {(["active", "done"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} className={`h-10 flex-1 items-center justify-center rounded-full ${tab === t ? "bg-navy" : ""}`}>
              <Text className={`font-body-bold text-sm ${tab === t ? "text-white" : "text-muted"}`}>
                {t === "active" ? `Active · ${active.length}` : `Done · ${done.length}`}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {rows.length === 0 ? (
        <EmptyState icon={ListBullets} title="No bookings yet" hint="Describe a problem and we'll find you a worker. Wala pang booking." action={{ label: "Book a worker", icon: Plus, onPress: () => router.navigate("/new-problem") }} />
      ) : shown.length === 0 ? (
        <EmptyState icon={ListBullets} title={tab === "active" ? "Nothing active right now" : "No finished jobs yet"} hint={tab === "active" ? "New bookings show up here." : "Completed jobs and receipts show up here."} />
      ) : null}
      {shown.map((r, i) => {
        const pending = r.status === "PENDING";
        const failed = r.status === "FAILED";
        return (
          <Animated.View key={r.ref} entering={FadeInDown.delay(i * 50).duration(250)}>
            <Pressable
              onPress={() => router.push({ pathname: "/booking/[ref]", params: { ref: r.ref } })}
              className={`gap-3 rounded-3xl bg-surface p-4 active:opacity-80 ${pending ? "border-[1.5px] border-dashed border-amber" : failed ? "border border-danger" : "border border-border"}`}
            >
              <View className="flex-row items-center gap-3">
                <ServiceTile service={r.service} />
                <View className="flex-1">
                  <Text className="font-body-bold text-[16px] text-ink" numberOfLines={1}>
                    {taskNameEn(r.task)}
                  </Text>
                  <Text className="font-body text-[13px] text-muted" numberOfLines={1}>
                    {serviceNameEn(r.service)} · {WHEN[r.urgency]} · {r.place}
                  </Text>
                </View>
                <StatusBadge status={r.status} />
              </View>
              {pending ? (
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 font-body-bold text-[13px] text-amber-ink">Sends when you're back online</Text>
                </View>
              ) : failed && r.outboxId ? (
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="flex-1 font-body-bold text-[13px] text-danger-ink">Couldn't send. We'll retry.</Text>
                  <Button label="Retry" icon={ArrowsClockwise} size="sm" variant="danger" onPress={() => void retry(r.outboxId)} disabled={!online} />
                </View>
              ) : LINE[r.status] ? (
                <View className="flex-row items-center gap-2 rounded-2xl bg-soft px-3 py-2">
                  <Text className="flex-1 font-body text-[13px] text-ink">{LINE[r.status]}</Text>
                  <CaretRight size={16} color={C.subtle} weight="bold" />
                </View>
              ) : null}
            </Pressable>
          </Animated.View>
        );
      })}
    </Screen>
  );
}
