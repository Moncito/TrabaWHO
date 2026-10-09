import type { BookingCreate, ServiceCode, TaskCode, Urgency } from "@trabawho/shared";
import { router } from "expo-router";
import { ArrowsClockwise, CaretRight, ListBullets } from "phosphor-react-native";
import { Pressable, Text, View } from "react-native";

import { AccountButtons } from "@/components/AccountButtons";
import { Screen } from "@/components/Screen";
import { Button, C, Card, EmptyState, ServiceTile, StatusBadge, taskName, UrgencyBadge } from "@/components/ui";
import { refreshMine, uiStatus, useCachedBookings, useOutbox, type UiStatus } from "@/data/bookings";
import { useSession } from "@/data/session";
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
  const { online } = useNetwork();
  const outbox = useOutbox();
  const cache = useCachedBookings();
  usePolling(() => (user ? refreshMine(user.id) : Promise.resolve()), online && !!user);

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

  return (
    <Screen title="Mga booking" subtitle={user?.name} right={<AccountButtons />}>
      {rows.length === 0 ? <EmptyState icon={ListBullets} title="Wala pang booking" hint="Pumunta sa Bago para mag-book." /> : null}
      {rows.map((r) => (
        <Pressable key={r.ref} onPress={() => router.push({ pathname: "/booking/[ref]", params: { ref: r.ref } })} className="active:opacity-80">
          <Card tone={r.status === "PENDING" ? "dashed" : "default"} className={r.status === "FAILED" ? "border-danger" : ""}>
            <View className="flex-row items-center gap-3">
              <ServiceTile service={r.service} />
              <View className="flex-1 gap-1">
                <Text className="font-body-bold text-[15px] text-ink">{taskName(r.task)}</Text>
                <Text className="font-body text-[13px] text-muted">{r.place}</Text>
                <View className="flex-row flex-wrap gap-2">
                  <StatusBadge status={r.status} />
                  <UrgencyBadge urgency={r.urgency} />
                </View>
              </View>
              <CaretRight size={20} color={C.subtle} />
            </View>
            {r.status === "PENDING" ? <Text className="font-body text-xs text-muted">Pending — ipapadala pag may internet</Text> : null}
            {r.status === "FAILED" && r.outboxId ? (
              <Button label="Subukan ngayon" icon={ArrowsClockwise} size="sm" variant="ghost" onPress={() => void retry(r.outboxId)} disabled={!online} disabledReason="Kailangan ng internet" />
            ) : null}
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}
