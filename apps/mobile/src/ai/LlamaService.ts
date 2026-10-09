import {
  getTask,
  intakeJsonSchema,
  intakeMessages,
  reportJsonSchema,
  reportMessages,
  runIntake,
  tasksForService,
  runReportExtraction,
  runScamCheck,
  scamJsonSchema,
  scamMessages,
  type ScamResult,
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
        aiStats.loadFinished(Date.now() - started);

        // Warm-up with the REAL intake prompt: llama.cpp keeps the processed prefix (system prompt +
        // catalog + few-shot) in its KV cache, so later intakes only process the client's text.
        // On the demo phone the first answer was ~35 s without this and ~8 s once the prefix was cached.
        const warmStarted = Date.now();
        await this.complete({ messages: intakeMessages("tumutulo ang gripo"), jsonSchema: intakeJsonSchema, maxTokens: 1 }, false);
        aiStats.warmupFinished(Date.now() - warmStarted);
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

  // llama.rn runs one completion per context at a time: serialize (prewarm vs. a real call).
  private queue: Promise<unknown> = Promise.resolve();

  private complete(req: Parameters<LlmCall>[0], countUsage: boolean): Promise<string> {
    const run = this.queue.then(async () => {
      if (!this.ctx) throw new Error("model not loaded");
      const res = await this.ctx.completion({
        messages: req.messages,
        jinja: true,
        enable_thinking: false,
        response_format: { type: "json_schema", json_schema: { schema: req.jsonSchema } },
        n_predict: req.maxTokens,
        temperature: 0,
      });
      if (countUsage) {
        this.usage.promptTokens += res.timings.prompt_n;
        this.usage.generatedTokens += res.timings.predicted_n;
        this.usage.genMs += res.timings.predicted_ms;
      }
      return res.text;
    });
    this.queue = run.catch(() => undefined);
    return run;
  }

  private llm: LlmCall = (req) => this.complete(req, true);

  /**
   * llama.cpp keeps only the LAST prompt prefix in its KV cache. Intake and report prompts differ,
   * so each screen pre-processes its own prompt on open (while the user types). Cheap if already cached.
   */
  async prewarm(kind: "intake" | "report" | "scam", bookingTask?: TaskCode): Promise<void> {
    try {
      await this.init();
      if (kind === "scam") {
        await this.complete({ messages: scamMessages("x"), jsonSchema: scamJsonSchema, maxTokens: 1 }, false);
      } else if (kind === "intake") {
        await this.complete({ messages: intakeMessages("x"), jsonSchema: intakeJsonSchema, maxTokens: 1 }, false);
      } else if (bookingTask) {
        const service = getTask(bookingTask).service;
        const allowed = tasksForService(service).map((t) => t.code);
        await this.complete({ messages: reportMessages("x", service), jsonSchema: reportJsonSchema(allowed), maxTokens: 1 }, false);
      }
    } catch {
      // best effort: the real call still works, just slower
    }
  }

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

  async checkScam(text: string): Promise<ScamResult> {
    await this.init().catch(() => undefined);
    const out = await runScamCheck(text, this.llm);
    aiStats.record({ kind: "scam", at: Date.now(), latencyMs: out.latencyMs, source: out.source === "model" ? "model" : "fallback", attempts: 1, ...this.takeUsage() });
    return out;
  }

  async extractReport(text: string, bookingTask: TaskCode): Promise<ReportDraft> {
    await this.init().catch(() => undefined);
    const out = await runReportExtraction(text, bookingTask, this.llm);
    aiStats.record({ kind: "report", at: Date.now(), latencyMs: out.latencyMs, source: out.source, attempts: out.attempts, ...this.takeUsage() });
    return out.draft;
  }
}
