import { useSyncExternalStore } from "react";

export type ToastKind = "syncing" | "synced" | "error";
export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

// One toast at a time (DESIGN S01).
let toast: Toast | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

export function showToast(kind: ToastKind, text: string, durationMs = 3000) {
  toast = { id: Date.now(), kind, text };
  listeners.forEach((l) => l());
  clearTimeout(timer);
  timer = setTimeout(() => {
    toast = null;
    listeners.forEach((l) => l());
  }, durationMs);
}

export function useToast() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => toast,
  );
}
