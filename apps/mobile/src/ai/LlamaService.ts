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

/**
 * On-device model via llama.rn. The GGUF is pushed with adb (see docs/SETUP.md), e.g.
 *   adb push qwen3-1.7b-q4_k_m.gguf /sdcard/Android/data/ph.trabawho.app/files/model.gguf
 */
export class LlamaService implements AIService {
  private ctx: LlamaContext | null = null;
  private loading: Promise<void> | null = null;

  constructor(
    readonly modelId: string,
    private readonly modelPath: string,
  ) {}

  init(): Promise<void> {
    this.loading ??= (async () => {
      this.ctx = await initLlama({ model: this.modelPath, n_ctx: 2048, n_gpu_layers: 99, use_mlock: true });
      await this.llm({ messages: [{ role: "user", content: "hi" }], jsonSchema: { type: "object" }, maxTokens: 1 });
    })();
    return this.loading;
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
    return res.text;
  };

  async intake(text: string): Promise<BookingCardData | null> {
    await this.init().catch(() => undefined); // pipeline falls back to keywords if load failed
    return (await runIntake(text, this.llm)).card;
  }

  async extractReport(text: string, bookingTask: TaskCode): Promise<ReportDraft> {
    await this.init().catch(() => undefined);
    return (await runReportExtraction(text, bookingTask, this.llm)).draft;
  }
}
