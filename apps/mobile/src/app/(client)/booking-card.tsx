import { Text, View } from "react-native";

import { NavButton, Note, Screen } from "@/components/Screen";
import { useDraftCard } from "@/state/draft";

// TODO(SWE): real Booking Card per design (C04–C08): edit sheet, address, Book -> outbox.
export default function BookingCard() {
  const card = useDraftCard();
  if (!card) {
    return (
      <Screen title="Pumili ng serbisyo">
        <Note>Hindi ma-classify. TODO: service picker.</Note>
      </Screen>
    );
  }
  return (
    <Screen title={card.serviceNameTl}>
      <View className="gap-2 rounded-xl bg-white p-4">
        <Text className="font-body-bold text-lg text-charcoal">{card.taskNameTl}</Text>
        <Text className="font-body text-charcoal">{card.urgency}</Text>
        <Text className="font-body text-charcoal">
          ₱{card.priceMin}–₱{card.priceMax} · {card.minutesMin}–{card.minutesMax} min
        </Text>
        <Text className="font-body text-muted">{card.summary}</Text>
      </View>
      {card.safetyNotes.map((n) => (
        <View key={n.hazard} className="rounded-xl bg-emergency p-4">
          <Text className="font-body-bold text-white">{n.text}</Text>
        </View>
      ))}
      <NavButton href="/bookings" label="Book" />
    </Screen>
  );
}
