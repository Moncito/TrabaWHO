import type { AIService } from "@trabawho/shared";

import { aiStats } from "./stats";
import { StubService } from "./StubService";

const ADB_MODEL_PATH = process.env.EXPO_PUBLIC_AI_MODEL_PATH ?? "file:///sdcard/Android/data/ph.trabawho.app/files/model.gguf";

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
    return new LlamaService(modelId, ADB_MODEL_PATH);
  }
  if (backend === "ollama") {
    const { OllamaService } = require("./OllamaService") as typeof import("./OllamaService");
    return new OllamaService(process.env.EXPO_PUBLIC_OLLAMA_MODEL ?? "qwen3:1.7b", process.env.EXPO_PUBLIC_OLLAMA_URL ?? "http://192.168.1.10:11434");
  }
  return new StubService();
}

export const ai: AIService = createAI();
aiStats.setBackend(process.env.EXPO_PUBLIC_AI_BACKEND ?? "stub", ai.modelId);

/** True when the in-app model picker / download applies (on-device llama backend only). */
export const canImportModel = (process.env.EXPO_PUBLIC_AI_BACKEND ?? "stub") === "llama";

/**
 * Backup for when `adb push` is blocked: pick a .gguf (e.g. from Downloads), copy it into
 * app storage, and reload the model. Returns false if the user cancelled.
 */
export async function importModelFromPicker(): Promise<boolean> {
  const { pickAndImportModel } = require("./modelFile") as typeof import("./modelFile");
  const path = await pickAndImportModel();
  if (!path) return false;
  await reloadModel();
  return true;
}

/** True when the on-device model file is in place (always true for stub / Edge mode). */
export function modelInstalled(): boolean {
  if (!canImportModel) return true;
  const { resolveModelPath } = require("./modelFile") as typeof import("./modelFile");
  return resolveModelPath(ADB_MODEL_PATH) !== null;
}

/** Load the model again after it was downloaded or imported. */
export async function reloadModel(): Promise<void> {
  const { LlamaService } = require("./LlamaService") as typeof import("./LlamaService");
  if (ai instanceof LlamaService) await ai.reload();
}

export { aiStats, useAiStats } from "./stats";
