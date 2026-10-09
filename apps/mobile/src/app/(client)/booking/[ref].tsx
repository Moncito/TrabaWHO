import { BOOKING_STATUSES, safetyFor, type BookingCreate, type BookingStatus } from "@trabawho/shared";
import { useLocalSearchParams } from "expo-router";
import { Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { Note, Screen } from "@/components/Screen";
import { Card, HazardAlert, Label, peso, PersonCard, ServiceTile, serviceName, StatusBadge, taskName, TotalsCard, UrgencyBadge } from "@/components/ui";
import { refreshMine, uiStatus, useCachedBookings, useOutbox } from "@/data/bookings";
import { useSession } from "@/data/session";
import { useNetwork, usePolling } from "@/data/sync";

/** C12: detail by clientRef so Pending items open too. */
export default function BookingDetail() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const user = useSession();
  const { online } = useNetwork();
  const server = useCachedBookings().find((b) => b.clientRef === ref);
  const row = useOutbox().find((r) => r.id === ref);
  usePolling(() => (user ? refreshMine(user.id) : Promise.resolve()), online && !!user);

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

  return (
    <Screen title={taskName(b.taskCode)} subtitle={serviceName(b.serviceCode)} back>
      <Card>
        <View className="flex-row items-center gap-3">
          <ServiceTile service={b.serviceCode} />
          <View className="flex-1 gap-1">
            <StatusBadge status={status} />
            <UrgencyBadge urgency={b.urgency} />
          </View>
        </View>
        <Timeline status={server?.status} />
      </Card>
      {server?.worker ? <PersonCard name={server.worker.name} role="worker" phone={server.worker.phone} verified /> : null}
      <HazardAlert notes={safety.safetyNotes} compact />
      <Card>
        <Label>AI summary</Label>
        <Text className="font-body text-[15px] text-ink">{b.aiSummary}</Text>
        <Label>Address</Label>
        <Text className="font-body text-[15px] text-ink">
          {b.address}, {b.barangay}
        </Text>
        {server ? (
          <>
            <Label>Estimated price</Label>
            <Text className="font-body-bold text-[15px] text-ink">
              {peso(server.priceMin)}–{peso(server.priceMax).slice(1)}
            </Text>
          </>
        ) : null}
      </Card>
      {server?.report ? <TotalsCard {...server.report} /> : null}
    </Screen>
  );
}

const STEPS: { label: string; status: BookingStatus | "SENT" }[] = [
  { label: "Naipadala", status: "SENT" },
  { label: "Hinahanapan", status: "REQUESTED" },
  { label: "Tinanggap", status: "ACCEPTED" },
  { label: "Ginagawa", status: "IN_PROGRESS" },
  { label: "Tapos na", status: "COMPLETED" },
];

/** StatusTimeline: done = ink dot, current = lime dot with ring (A7). */
function Timeline({ status }: { status?: BookingStatus }) {
  const current = status ? BOOKING_STATUSES.indexOf(status) + 1 : -1; // SENT is step 0
  return (
    <View className="gap-2 pt-2">
      {STEPS.map((s, i) => {
        const done = i < current || (status === "COMPLETED" && i === current);
        const isCurrent = i === current && status !== "COMPLETED";
        return (
          <View key={s.label} className="flex-row items-center gap-3">
            {isCurrent ? (
              <Animated.View entering={ZoomIn.springify()} className="h-5 w-5 rounded-full border-4 border-amber-bg bg-lime" />
            ) : (
              <View className={`h-5 w-5 rounded-full ${done ? "bg-navy" : "border-2 border-border-strong bg-surface"}`} />
            )}
            <Text className={`font-body-semibold text-sm ${done || isCurrent ? "text-ink" : "text-subtle"}`}>{s.label}</Text>
          </View>
        );
      })}
    </View>
  );
}
