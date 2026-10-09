import type { BookingStatus, HazardCode, PricedMaterial, ServiceCode, TaskCode, Urgency } from "@trabawho/shared";
import { router } from "expo-router";

import { endSession, getToken } from "./session";

// Laptop LAN IP on the demo hotspot, or http://localhost:3000 with `adb reverse tcp:3000 tcp:3000`.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export interface Person {
  id: string;
  name: string;
  phone: string;
  isVerified?: boolean;
}

export interface ServerReport {
  id: string;
  clientRef: string;
  bookingId: string;
  tasksDone: TaskCode[];
  materials: PricedMaterial[];
  durationMinutes: number;
  notes: string;
  laborCost: number;
  materialsCost: number;
  total: number;
  createdAt: string;
}

/** Booking as returned by the API (with client, worker and report included). */
export interface ServerBooking {
  id: string;
  clientRef: string;
  clientId: string;
  workerId: string | null;
  serviceCode: ServiceCode;
  taskCode: TaskCode;
  urgency: Urgency;
  hazards: HazardCode[];
  aiSummary: string;
  address: string;
  city: string;
  barangay: string;
  priceMin: number;
  priceMax: number;
  status: BookingStatus;
  createdOffline: boolean;
  createdAt: string;
  updatedAt: string;
  client: Person;
  worker: Person | null;
  report: ServerReport | null;
}

/** Server answered with an error status. Network failures throw other errors (TypeError / AbortError). */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** First readable message from a Zod `flatten()` error body, if any. */
function errorText(err: unknown, status: number): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    const e = err as { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> };
    const field = Object.entries(e.fieldErrors ?? {}).find(([, v]) => v?.length);
    if (field) return `${field[0]}: ${field[1]![0]}`;
    if (e.formErrors?.length) return e.formErrors[0]!;
  }
  return `HTTP ${status}`;
}

/**
 * Calls the API with the current session's bearer token. A 401 on an authenticated call means the
 * token expired or was revoked: the session is cleared and the app goes back to login.
 */
export async function api<T>(path: string, opts: { method?: "GET" | "POST" | "PATCH"; body?: unknown } = {}): Promise<T> {
  const token = getToken();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(API_URL + path, {
      method: opts.method ?? "GET",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: unknown };
      if (res.status === 401 && token && token === getToken()) {
        endSession();
        router.replace("/login");
      }
      throw new ApiError(res.status, errorText(err.error, res.status));
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
