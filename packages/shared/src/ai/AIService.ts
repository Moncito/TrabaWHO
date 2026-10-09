import type { BookingCardData, ReportDraft, TaskCode } from "../schemas";

/**
 * The contract between the AI side and the app (ARCHITECTURE 3.2).
 * Implementations: StubService (SWE, hardcoded), LlamaService (llama.rn on phone),
 * OllamaService (Edge mode, laptop over hotspot). All of them should delegate to
 * runIntake / runReportExtraction in ./pipeline so rules and fallbacks stay identical.
 */
export interface AIService {
  /** Load and warm up the model. Safe to call more than once. */
  init(): Promise<void>;
  /** Short model id for the booking record and disclosure, e.g. "qwen3-1.7b-q4". */
  readonly modelId: string;
  /** null = could not classify at all; show the service picker. */
  intake(text: string): Promise<BookingCardData | null>;
  extractReport(text: string, bookingTask: TaskCode): Promise<ReportDraft>;
}
