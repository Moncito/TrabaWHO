import { useSyncExternalStore } from "react";

/**
 * On-phone AI telemetry for the demo "proof" step and for measuring real latency.
 * Kept in memory only (nothing is sent anywhere).
 */
export interface AiCallStat {
  kind: "intake" | "report" | "scam";
  at: number;
  latencyMs: number;
  source: "model" | "fallback" | "none";
  attempts: number;
  promptTokens?: number;
  generatedTokens?: number;
  tokensPerSecond?: number;
}

export interface AiStats {
  backend: string;
  modelId: string;
  loadState: "idle" | "loading" | "ready" | "failed";
  loadMs?: number;
  /** Time to pre-process the intake prompt into the KV cache after loading. */
  warmupMs?: number;
  loadError?: string;
  modelPath?: string;
  calls: AiCallStat[];
}

let state: AiStats = { backend: "stub", modelId: "-", loadState: "idle", calls: [] };
const listeners = new Set<() => void>();

function set(patch: Partial<AiStats>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const aiStats = {
  setBackend(backend: string, modelId: string) {
    set({ backend, modelId });
  },
  setModelPath(modelPath: string) {
    set({ modelPath });
  },
  loadStarted() {
    set({ loadState: "loading", loadError: undefined });
  },
  loadFinished(loadMs: number) {
    set({ loadState: "ready", loadMs });
  },
  warmupFinished(warmupMs: number) {
    set({ warmupMs });
  },
  loadFailed(error: unknown) {
    set({ loadState: "failed", loadError: error instanceof Error ? error.message : String(error) });
  },
  record(call: AiCallStat) {
    set({ calls: [call, ...state.calls].slice(0, 20) });
  },
  reset() {
    set({ calls: [] });
  },
};

export function useAiStats(): AiStats {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
  );
}
