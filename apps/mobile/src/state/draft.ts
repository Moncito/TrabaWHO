import type { BookingCardData } from "@trabawho/shared";
import { useSyncExternalStore } from "react";

// Tiny in-memory store for the Booking Card between screens. Swap for SQLite/context later if needed.
let draft: BookingCardData | null = null;
const listeners = new Set<() => void>();

export function setDraftCard(card: BookingCardData | null) {
  draft = card;
  listeners.forEach((l) => l());
}

export function useDraftCard() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => draft,
  );
}
