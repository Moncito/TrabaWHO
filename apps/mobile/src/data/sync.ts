import NetInfo, { useNetInfo } from "@react-native-community/netinfo";
import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

import { showToast } from "@/state/toast";

import { api, ApiError, type ServerBooking } from "./api";
import { cacheBookings, refreshMine, setOutboxStatus, type OutboxRow } from "./bookings";
import { db } from "./db";
import { getUser } from "./session";

// isConnected only (not isInternetReachable): a demo hotspot to the laptop API may have no internet.
export function useNetwork() {
  const net = useNetInfo();
  return { online: net.isConnected !== false };
}

let flushing: Promise<void> | null = null;

/** Send pending/failed outbox rows oldest first. One flush at a time (FLOWS 5). */
export function flush(): Promise<void> {
  flushing ??= runFlush().finally(() => {
    flushing = null;
  });
  return flushing;
}

async function runFlush() {
  if ((await NetInfo.fetch()).isConnected !== true) return;
  const rows = db.getAllSync<OutboxRow>("SELECT * FROM outbox WHERE status != 'sent' ORDER BY createdAt ASC");
  if (!rows.length) return;
  showToast("syncing", `Ipinapadala ang ${rows.length} item...`);

  let sent = 0;
  for (const row of rows) {
    try {
      if (row.type === "BOOKING_CREATE") {
        const b = await api<ServerBooking>("/bookings", { method: "POST", body: JSON.parse(row.payload), userId: row.userId });
        cacheBookings([b]);
      } else {
        await api(`/bookings/${row.bookingId}/report`, { method: "POST", body: JSON.parse(row.payload), userId: row.userId });
      }
      setOutboxStatus(row.id, "sent");
      sent++;
    } catch (e) {
      if (!(e instanceof ApiError)) {
        // Network error: keep the row pending and stop; the next trigger retries.
        setOutboxStatus(row.id, "pending", "network");
        break;
      }
      // 409 on a report = booking already completed: treat as sent.
      if (row.type === "REPORT_CREATE" && e.status === 409) {
        setOutboxStatus(row.id, "sent");
        sent++;
        continue;
      }
      console.warn("outbox row failed", row.id, e.status, e.message);
      setOutboxStatus(row.id, "failed", e.message);
    }
  }

  const user = getUser();
  if (sent && user) await refreshMine(user.id).catch(() => undefined);
  if (sent === rows.length) showToast("synced", `Naipadala na ang ${sent} item`);
  else if (sent) showToast("error", `${sent}/${rows.length} naipadala. Susubukan ulit ang iba.`);
  else showToast("error", "Hindi pa naipapadala — susubukan ulit");
}

/** Retry one failed row (or all) now. */
export function retry(id?: string) {
  if (id) db.runSync("UPDATE outbox SET status = 'pending' WHERE id = ? AND status = 'failed'", id);
  else db.runSync("UPDATE outbox SET status = 'pending' WHERE status = 'failed'");
  return flush();
}

/** Flush on reconnect, on app foreground and at start. Call once from the root layout. */
export function useSyncTriggers() {
  useEffect(() => {
    let wasOnline: boolean | null = null;
    const offNet = NetInfo.addEventListener((s) => {
      const online = s.isConnected === true;
      if (wasOnline === false && online) showToast("synced", "Online ulit");
      if (online && wasOnline !== true) void flush();
      wasOnline = online;
    });
    const app = AppState.addEventListener("change", (s) => {
      if (s === "active") void flush();
    });
    return () => {
      offNet();
      app.remove();
    };
  }, []);
}

/** Run fn now and every 5 s while the screen is focused and online. */
export function usePolling(fn: () => Promise<unknown>, enabled: boolean, intervalMs = 5000) {
  const ref = useRef(fn);
  ref.current = fn;
  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      const tick = () => void ref.current().catch(() => undefined);
      tick();
      const t = setInterval(tick, intervalMs);
      return () => clearInterval(t);
    }, [enabled, intervalMs]),
  );
}
