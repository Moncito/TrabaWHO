import type { BookingCreate, BookingStatus, ReportCreate } from "@trabawho/shared";

import { api, type ServerBooking } from "./api";
import { db, kvGet, kvSet, notify, useDbQuery } from "./db";

// ---------- cancel ----------

export const CANCEL_REASONS = [
  { id: "fixed", label: "Problem is already fixed" },
  { id: "other-worker", label: "I found another worker" },
  { id: "time", label: "Wrong date or time" },
  { id: "details", label: "Wrong address or details" },
  { id: "price", label: "Estimate is too high" },
  { id: "other", label: "Other reason" },
] as const;

export interface CancelInfo {
  reason: string;
  at: number;
  /** Snapshot for bookings that never left the phone (their outbox row is deleted). */
  booking?: Pick<BookingCreate, "serviceCode" | "taskCode" | "urgency" | "address" | "barangay">;
}

/** Why and when this phone cancelled a booking (shown on the cancelled screen; kept on the phone). */
export const cancelInfo = (ref: string) => kvGet<CancelInfo>(`cancel:${ref}`);

/**
 * Cancel before a worker accepts. A booking still in the outbox is simply removed (it never left
 * the phone); a sent one is cancelled on the server, which refuses if a worker already accepted.
 */
export async function cancelBooking(ref: string, reason: string, server?: ServerBooking | null, local?: BookingCreate | null) {
  if (server) cacheBookings([await api<ServerBooking>(`/bookings/${server.id}/cancel`, { method: "POST" })]);
  else db.runSync("DELETE FROM outbox WHERE id = ? AND status != 'sent'", ref);
  const info: CancelInfo = { reason, at: Date.now(), ...(local && !server ? { booking: { serviceCode: local.serviceCode, taskCode: local.taskCode, urgency: local.urgency, address: local.address, barangay: local.barangay } } : {}) };
  kvSet(`cancel:${ref}`, info);
  notify();
}

// ---------- bookings_cache ----------

/** Upsert server bookings; only notifies when something actually changed (polling runs every 5 s). */
export function cacheBookings(list: ServerBooking[]) {
  let changed = false;
  db.withTransactionSync(() => {
    for (const b of list) {
      const json = JSON.stringify(b);
      const old = db.getFirstSync<{ json: string }>("SELECT json FROM bookings_cache WHERE id = ?", b.id);
      if (old?.json === json) continue;
      db.runSync("INSERT OR REPLACE INTO bookings_cache (id, clientRef, json) VALUES (?, ?, ?)", b.id, b.clientRef, json);
      changed = true;
    }
  });
  if (changed) notify();
}

export function cachedBookings(): ServerBooking[] {
  return db
    .getAllSync<{ json: string }>("SELECT json FROM bookings_cache")
    .map((r) => JSON.parse(r.json) as ServerBooking)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function useCachedBookings(): ServerBooking[] {
  return useDbQuery(cachedBookings);
}

/** The signed-in user's bookings (the API scopes /bookings/mine by the bearer token). */
export async function refreshMine(): Promise<ServerBooking[]> {
  const list = await api<ServerBooking[]>("/bookings/mine");
  cacheBookings(list);
  return list;
}

// ---------- outbox ----------

export type OutboxStatus = "pending" | "sent" | "failed";

export interface OutboxRow {
  id: string;
  type: "BOOKING_CREATE" | "REPORT_CREATE";
  userId: string;
  bookingId: string | null;
  payload: string;
  status: OutboxStatus;
  attempts: number;
  error: string | null;
  createdAt: number;
}

/** Writes to the outbox first (ARCHITECTURE 4.2); the sync engine sends it when online. */
export function enqueueBooking(userId: string, payload: BookingCreate) {
  db.runSync(
    "INSERT INTO outbox (id, type, userId, payload, createdAt) VALUES (?, 'BOOKING_CREATE', ?, ?, ?)",
    payload.clientRef,
    userId,
    JSON.stringify(payload),
    Date.now(),
  );
  notify();
}

export function enqueueReport(userId: string, bookingId: string, payload: ReportCreate) {
  db.runSync(
    "INSERT INTO outbox (id, type, userId, bookingId, payload, createdAt) VALUES (?, 'REPORT_CREATE', ?, ?, ?, ?)",
    payload.clientRef,
    userId,
    bookingId,
    JSON.stringify(payload),
    Date.now(),
  );
  notify();
}

export function outboxRows(): OutboxRow[] {
  return db.getAllSync<OutboxRow>("SELECT * FROM outbox ORDER BY createdAt DESC");
}

export function useOutbox(): OutboxRow[] {
  return useDbQuery(outboxRows);
}

export function setOutboxStatus(id: string, status: OutboxStatus, error: string | null = null) {
  db.runSync(
    "UPDATE outbox SET status = ?, error = ?, attempts = attempts + ? WHERE id = ?",
    status,
    error,
    status === "sent" ? 0 : 1,
    id,
  );
  notify();
}

// ---------- UI status (FLOWS 4) ----------

export type UiStatus = "PENDING" | "FAILED" | BookingStatus;

/** Server truth wins once it exists; before that the local outbox state is shown. */
export function uiStatus(server?: ServerBooking | null, outbox?: OutboxRow | null): UiStatus {
  if (server) return server.status;
  return outbox?.status === "failed" ? "FAILED" : "PENDING";
}

/** A not-yet-synced report for this booking, if any. */
export function pendingReportFor(rows: OutboxRow[], bookingId: string): OutboxRow | undefined {
  return rows.find((r) => r.type === "REPORT_CREATE" && r.bookingId === bookingId && r.status !== "sent");
}
