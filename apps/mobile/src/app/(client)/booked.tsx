import type { BookingCreate } from "@trabawho/shared";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle, CloudArrowUp, ListBullets, WarningCircle } from "phosphor-react-native";
import { Text, View } from "react-native";

import { Screen } from "@/components/Screen";
import { Button, Card, ServiceTile, StatusBadge, StatusHero, serviceName, taskName } from "@/components/ui";
import { uiStatus, useCachedBookings, useOutbox } from "@/data/bookings";

/** C09 sent / C10 pending. Flips live when the outbox row syncs. */
export default function Booked() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const row = useOutbox().find((r) => r.id === ref);
  const server = useCachedBookings().find((b) => b.clientRef === ref);
  const status = uiStatus(server, row);
  const p = row ? (JSON.parse(row.payload) as BookingCreate) : null;
  const sent = status !== "PENDING" && status !== "FAILED";

  return (
    <Screen title="Booking" footer={<Button label="View my bookings" icon={ListBullets} onPress={() => router.replace("/bookings")} />}>
      {sent ? (
        <StatusHero kind="sent" icon={CheckCircle} title="Request sent!" message="Finding you a worker now. Hinahanapan ka na ng worker." />
      ) : status === "FAILED" ? (
        <StatusHero kind="failed" icon={WarningCircle} title="Not sent yet" message="We'll retry automatically. Hindi pa naipapadala, susubukan ulit." />
      ) : (
        <StatusHero kind="pending" icon={CloudArrowUp} title="Booking saved!" message="It's safe on your phone and sends itself when you're back online. Kusa itong ipapadala." />
      )}
      {p ? (
        <Card>
          <View className="flex-row items-center gap-3">
            <ServiceTile service={p.serviceCode} />
            <View className="flex-1 gap-1">
              <Text className="font-body text-[13px] text-muted">{serviceName(p.serviceCode)}</Text>
              <Text className="font-body-bold text-[17px] text-ink">{taskName(p.taskCode)}</Text>
            </View>
            <StatusBadge status={status} />
          </View>
          <Text className="font-body text-[13px] text-muted">
            {p.address}, {p.barangay}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
