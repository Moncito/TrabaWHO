import {
  runIntake,
  runReportExtraction,
  type AIService,
  type BookingCardData,
  type LlmCall,
  type ReportDraft,
  type TaskCode,
} from "@trabawho/shared";
import { initLlama, type LlamaContext } from "llama.rn";

import { resolveModelPath } from "./modelFile";
import { aiStats } from "./stats";

interface Usage {
  promptTokens: number;
  generatedTokens: number;
  genMs: number;
}

/**
 * On-device model via llama.rn. The GGUF is pushed with adb (see docs/SETUP.md), e.g.
 *   adb push models/qwen3-1.7b-q4_k_m.gguf /sdcard/Android/data/ph.trabawho.app/files/model.gguf
 */
export class LlamaService implements AIService {
  private ctx: LlamaContext | null = null;
  private loading: Promise<void> | null = null;
  private usage: Usage = { promptTokens: 0, generatedTokens: 0, genMs: 0 };

  constructor(
    readonly modelId: string,
    private readonly adbModelPath: string,
  ) {}

  init(): Promise<void> {
    this.loading ??= (async () => {
      aiStats.loadStarted();
      const started = Date.now();
      try {
        const path = resolveModelPath(this.adbModelPath);
        if (!path) throw new Error("Model file not found. Push it with adb, or use AI stats → Pumili ng model file.");
        aiStats.setModelPath(path);
        this.ctx = await initLlama({ model: path, n_ctx: 2048, n_gpu_layers: 99, use_mlock: true });
        // warm-up so the first real answer isn't slow
        await this.llm({ messages: [{ role: "user", content: "hi" }], jsonSchema: { type: "object" }, maxTokens: 1 });
        aiStats.loadFinished(Date.now() - started);
      } catch (e) {
        aiStats.loadFailed(e);
        this.loading = null; // allow a retry
        throw e;
      }
    })();
    return this.loading;
  }

  /** Drop the loaded model and load again (after importing a model file in-app). */
  async reload(): Promise<void> {
    await this.loading?.catch(() => undefined);
    await this.ctx?.release().catch(() => undefined);
    this.ctx = null;
    this.loading = null;
    return this.init();
  }

  private llm: LlmCall = async ({ messages, jsonSchema, maxTokens }) => {
    if (!this.ctx) throw new Error("model not loaded");
    const res = await this.ctx.completion({
      messages,
      jinja: true,
      enable_thinking: false,
      response_format: { type: "json_schema", json_schema: { schema: jsonSchema } },
      n_predict: maxTokens,
      temperature: 0,
    });
    this.usage.promptTokens += res.timings.prompt_n;
    this.usage.generatedTokens += res.timings.predicted_n;
    this.usage.genMs += res.timings.predicted_ms;
    return res.text;
  };

  private takeUsage() {
    const u = this.usage;
    this.usage = { promptTokens: 0, generatedTokens: 0, genMs: 0 };
    return {
      promptTokens: u.promptTokens || undefined,
      generatedTokens: u.generatedTokens || undefined,
      tokensPerSecond: u.genMs > 0 ? Math.round((u.generatedTokens / u.genMs) * 1000 * 10) / 10 : undefined,
    };
  }

  async intake(text: string): Promise<BookingCardData | null> {
    await this.init().catch(() => undefined); // pipeline falls back to keywords if load failed
    const out = await runIntake(text, this.llm);
    aiStats.record({ kind: "intake", at: Date.now(), latencyMs: out.latencyMs, source: out.source, attempts: out.attempts, ...this.takeUsage() });
    return out.card;
  }

  async extractReport(text: string, bookingTask: TaskCode): Promise<ReportDraft> {
    await this.init().catch(() => undefined);
    const out = await runReportExtraction(text, bookingTask, this.llm);
    aiStats.record({ kind: "report", at: Date.now(), latencyMs: out.latencyMs, source: out.source, attempts: out.attempts, ...this.takeUsage() });
    return out.draft;
  }
}
