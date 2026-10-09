import type { BookingCardData } from "@trabawho/shared";
import { useSyncExternalStore } from "react";

// Tiny in-memory store for the intake draft between screens (FLOWS 1: never pass the card via params).
interface Draft {
  text: string;
  card: BookingCardData | null;
  editedByUser: boolean;
}
let draft: Draft = { text: "", card: null, editedByUser: false };
const listeners = new Set<() => void>();

function set(next: Partial<Draft>) {
  draft = { ...draft, ...next };
  listeners.forEach((l) => l());
}

export function setDraftText(text: string) {
  set({ text });
}

export function setDraftCard(card: BookingCardData | null, editedByUser = false) {
  set({ card, editedByUser });
}

export function resetDraft() {
  set({ text: "", card: null, editedByUser: false });
}

export function useDraft(): Draft {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => draft,
  );
}

export function useDraftCard() {
  return useDraft().card;
}
