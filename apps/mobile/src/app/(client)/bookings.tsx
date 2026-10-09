import { Note, Screen } from "@/components/Screen";

// TODO(SWE): bookings_cache + pending outbox items, status badges, poll every 5 s (C11, C12).
export default function Bookings() {
  return (
    <Screen title="Mga booking">
      <Note>No bookings yet.</Note>
    </Screen>
  );
}
