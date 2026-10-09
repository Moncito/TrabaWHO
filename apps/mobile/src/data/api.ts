import type {
  BookingStatus,
  HazardCode,
  PricedMaterial,
  ServiceCode,
  TaskCode,
  Urgency,
} from "@trabawho/shared";

// Laptop LAN IP on the demo hotspot, or http://localhost:3000 with `adb reverse tcp:3000 tcp:3000`.
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export interface DemoUser {
  id: string;
  role: "CLIENT" | "WORKER";
  name: string;
  services: ServiceCode[];
  city: string;
  barangay: string;
  isVerified: boolean;
}

export interface Person {
  id: string;
  name: string;
  phone: string;
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

export async function api<T>(
  path: string,
  opts: { method?: "GET" | "POST"; body?: unknown; userId?: string } = {},
): Promise<T> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(API_URL + path, {
      method: opts.method ?? "GET",
      signal: ctrl.signal,
      headers: {
        "content-type": "application/json",
        ...(opts.userId ? { "x-user-id": opts.userId } : {}),
      },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: unknown };
      throw new ApiError(res.status, typeof err.error === "string" ? err.error : `HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}
