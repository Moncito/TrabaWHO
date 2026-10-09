import type { BookingCreate } from "@trabawho/shared";
import { router, useLocalSearchParams } from "expo-router";
import { CheckCircle, CloudArrowUp, WarningCircle } from "phosphor-react-native";
import { Text, View } from "react-native";
import Animated, { ZoomIn } from "react-native-reanimated";

import { Screen } from "@/components/Screen";
import { Button, C, Card, StatusBadge, serviceName, taskName } from "@/components/ui";
import { uiStatus, useCachedBookings, useOutbox } from "@/data/bookings";

/** C09 sent / C10 pending. Flips live when the outbox row syncs. */
export default function Booked() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const row = useOutbox().find((r) => r.id === ref);
  const server = useCachedBookings().find((b) => b.clientRef === ref);
  const status = uiStatus(server, row);
  const p = row ? (JSON.parse(row.payload) as BookingCreate) : null;
  const sent = status !== "PENDING" && status !== "FAILED";
  const Icon = sent ? CheckCircle : status === "FAILED" ? WarningCircle : CloudArrowUp;

  return (
    <Screen title={sent ? "Naipadala na!" : "Naka-save sa phone"} footer={<Button label="Tingnan ang bookings" onPress={() => router.replace("/bookings")} />}>
      <View className="items-center gap-3 py-6">
        <Animated.View key={status} entering={ZoomIn.springify()} className={`h-28 w-28 items-center justify-center rounded-full ${sent ? "bg-navy" : status === "FAILED" ? "bg-danger-bg" : "border-2 border-dashed border-amber bg-amber-bg"}`}>
          <Icon size={56} color={sent ? C.white : status === "FAILED" ? C.danger : C.amberInk} weight={sent ? "fill" : "bold"} />
        </Animated.View>
        <Text className="text-center font-body-semibold text-[15px] text-ink">
          {sent ? "Hinahanapan ka na ng worker." : status === "FAILED" ? "Hindi pa naipapadala — susubukan ulit" : "Pending — ipapadala pag may internet"}
        </Text>
      </View>
      {p ? (
        <Card>
          <StatusBadge status={status} />
          <Text className="font-body-semibold text-[13px] text-muted">{serviceName(p.serviceCode)}</Text>
          <Text className="font-body-bold text-[17px] text-ink">{taskName(p.taskCode)}</Text>
          <Text className="font-body text-[13px] text-muted">
            {p.address}, {p.barangay}
          </Text>
        </Card>
      ) : null}
    </Screen>
  );
}
