import type { PublicUser } from "@trabawho/shared";

import { db, kvGet, kvSet, notify, useDbQuery } from "./db";

/**
 * Signed-in session: JWT in expo-secure-store (Keystore-backed) when the native module is in
 * this build, else in the local SQLite kv table. The profile is cached in kv so the app
 * (intake, Pending bookings, reports) keeps working offline after the first login.
 */
type SecureStoreModule = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  deleteItemAsync(key: string): Promise<void>;
};

let secure: SecureStoreModule | null = null;
try {
  // Older dev builds may not include the native module yet: fall back to kv instead of crashing.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const m = require("expo-secure-store") as SecureStoreModule;
  if (typeof m.getItem === "function") secure = m;
} catch {
  secure = null;
}

const TOKEN_KEY = "trabawho_token";
const USER_KEY = "session_user";

let token: string | null = readToken();

function readToken(): string | null {
  try {
    const t = secure?.getItem(TOKEN_KEY);
    if (t) return t;
  } catch {
    // Keystore unavailable: use kv below.
  }
  return kvGet<string>(TOKEN_KEY);
}

function writeToken(t: string | null) {
  token = t;
  let stored = false;
  if (secure) {
    try {
      if (t) secure.setItem(TOKEN_KEY, t);
      else void secure.deleteItemAsync(TOKEN_KEY).catch(() => undefined);
      stored = !!t;
    } catch {
      stored = false;
    }
  }
  kvSet(TOKEN_KEY, stored ? null : t);
}

export type SessionUser = PublicUser;

export function getToken(): string | null {
  return token;
}

/** The signed-in user, or null. A user without a token is treated as signed out. */
export function getUser(): SessionUser | null {
  return token ? kvGet<SessionUser>(USER_KEY) : null;
}

export function useSession(): SessionUser | null {
  return useDbQuery(getUser);
}

export function startSession(t: string, user: SessionUser) {
  const prev = kvGet<SessionUser>(USER_KEY);
  // Cached bookings belong to one account; never show them to another.
  if (prev && prev.id !== user.id) db.runSync("DELETE FROM bookings_cache");
  writeToken(t);
  kvSet(USER_KEY, user);
}

/** Refresh the cached profile (after GET /me or PATCH /me). */
export function updateSessionUser(user: SessionUser) {
  if (token) kvSet(USER_KEY, user);
}

/** Log out. Unsent outbox rows stay (they are tagged with their user) and send when that user logs back in. */
export function endSession() {
  writeToken(null);
  kvSet(USER_KEY, null);
  db.runSync("DELETE FROM bookings_cache");
  notify();
}
