import type { BookingCreate } from "@trabawho/shared";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { CancelSheet } from "@/components/CancelSheet";
import { ApiError } from "@/data/api";
import { cancelBooking, refreshMine, useCachedBookings, useOutbox } from "@/data/bookings";
import { useSession } from "@/data/session";

/** Cancel sheet as a root-stack transparentModal: drawn above the tabs, flush with the bottom edge. */
export default function CancelBooking() {
  const { ref } = useLocalSearchParams<{ ref: string }>();
  const user = useSession();
  const server = useCachedBookings().find((b) => b.clientRef === ref);
  const row = useOutbox().find((r) => r.id === ref);
  const p = row ? (JSON.parse(row.payload) as BookingCreate) : null;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm(reason: string) {
    setBusy(true);
    setError(null);
    try {
      await cancelBooking(ref!, reason, server, p);
      router.back();
    } catch (e) {
      setError(e instanceof ApiError && e.status === 409 ? "It can't be cancelled anymore: a worker may have just accepted. Check the booking." : "Couldn't cancel. Check your internet and try again.");
      if (user) await refreshMine().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  }

  return <CancelSheet busy={busy} error={error} onClose={() => router.back()} onConfirm={(r) => void confirm(r)} />;
}
