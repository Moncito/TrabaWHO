import { openDatabaseSync } from "expo-sqlite";
import { useSyncExternalStore } from "react";

/** Local SQLite (ARCHITECTURE 4.1): outbox, bookings_cache, plus a small key-value table. */
export const db = openDatabaseSync("trabawho.db");

db.execSync(`
  CREATE TABLE IF NOT EXISTS outbox (
    id TEXT PRIMARY KEY NOT NULL,          -- clientRef (uuid)
    type TEXT NOT NULL,                    -- BOOKING_CREATE | REPORT_CREATE
    userId TEXT NOT NULL,                  -- x-user-id at enqueue time (account can be switched later)
    bookingId TEXT,                        -- REPORT_CREATE only
    payload TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending | sent | failed
    attempts INTEGER NOT NULL DEFAULT 0,
    error TEXT,
    createdAt INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS bookings_cache (
    id TEXT PRIMARY KEY NOT NULL,
    clientRef TEXT NOT NULL,
    json TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY NOT NULL, v TEXT NOT NULL);
`);

// Change notifier: writers call notify(), hooks re-read SQLite on the next render.
let version = 0;
const listeners = new Set<() => void>();

export function notify() {
  version++;
  listeners.forEach((l) => l());
}

export function useDbVersion() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => version,
  );
}

export function kvGet<T>(k: string): T | null {
  const row = db.getFirstSync<{ v: string }>("SELECT v FROM kv WHERE k = ?", k);
  return row ? (JSON.parse(row.v) as T) : null;
}

export function kvSet(k: string, v: unknown) {
  if (v === null) db.runSync("DELETE FROM kv WHERE k = ?", k);
  else db.runSync("INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)", k, JSON.stringify(v));
  notify();
}
