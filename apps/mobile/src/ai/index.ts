import type { AIService } from "@trabawho/shared";

import { aiStats } from "./stats";
import { StubService } from "./StubService";

/**
 * Pick the backend with EXPO_PUBLIC_AI_BACKEND in apps/mobile/.env:
 *   stub (default) | llama | ollama
 * llama.rn is required lazily so Expo Go / web don't crash on the missing native module.
 */
function createAI(): AIService {
  const backend = process.env.EXPO_PUBLIC_AI_BACKEND ?? "stub";
  const modelId = process.env.EXPO_PUBLIC_AI_MODEL_ID ?? "qwen3-1.7b-q4";

  if (backend === "llama") {
    const { LlamaService } = require("./LlamaService") as typeof import("./LlamaService");
    const path = process.env.EXPO_PUBLIC_AI_MODEL_PATH ?? "file:///sdcard/Android/data/ph.trabawho.app/files/model.gguf";
    return new LlamaService(modelId, path);
  }
  if (backend === "ollama") {
    const { OllamaService } = require("./OllamaService") as typeof import("./OllamaService");
    return new OllamaService(process.env.EXPO_PUBLIC_OLLAMA_MODEL ?? "qwen3:1.7b", process.env.EXPO_PUBLIC_OLLAMA_URL ?? "http://192.168.1.10:11434");
  }
  return new StubService();
}

export const ai: AIService = createAI();
aiStats.setBackend(process.env.EXPO_PUBLIC_AI_BACKEND ?? "stub", ai.modelId);

/** True when the in-app model picker applies (on-device llama backend only). */
export const canImportModel = (process.env.EXPO_PUBLIC_AI_BACKEND ?? "stub") === "llama";

/**
 * Backup for when `adb push` is blocked: pick a .gguf (e.g. from Downloads), copy it into
 * app storage, and reload the model. Returns false if the user cancelled.
 */
export async function importModelFromPicker(): Promise<boolean> {
  const { pickAndImportModel } = require("./modelFile") as typeof import("./modelFile");
  const { LlamaService } = require("./LlamaService") as typeof import("./LlamaService");
  const path = await pickAndImportModel();
  if (!path) return false;
  if (ai instanceof LlamaService) await ai.reload();
  return true;
}

export { aiStats, useAiStats } from "./stats";
