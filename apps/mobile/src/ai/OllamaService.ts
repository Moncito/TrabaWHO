import {
  runIntake,
  runReportExtraction,
  type AIService,
  type BookingCardData,
  type LlmCall,
  type ReportDraft,
  type TaskCode,
} from "@trabawho/shared";

/** Edge mode: same model in Ollama on a laptop over a local hotspot (no internet). Disclose it. */
export class OllamaService implements AIService {
  constructor(
    readonly modelId: string,
    private readonly baseUrl: string,
  ) {}

  async init() {}

  private llm: LlmCall = async ({ messages, jsonSchema, maxTokens }) => {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        stream: false,
        format: jsonSchema,
        think: false,
        options: { temperature: 0, num_predict: maxTokens },
      }),
    });
    if (!res.ok) throw new Error(`ollama ${res.status}`);
    return ((await res.json()) as { message?: { content?: string } }).message?.content ?? "";
  };

  async intake(text: string): Promise<BookingCardData | null> {
    return (await runIntake(text, this.llm)).card;
  }

  async extractReport(text: string, bookingTask: TaskCode): Promise<ReportDraft> {
    return (await runReportExtraction(text, bookingTask, this.llm)).draft;
  }
}
