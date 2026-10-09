import {
  runIntake,
  runReportExtraction,
  type AIService,
  type BookingCardData,
  type ReportDraft,
  type TaskCode,
} from "@trabawho/shared";

import { aiStats } from "./stats";

/**
 * No model: always uses the keyword fallback + rules engine. Works in Expo Go and on web,
 * so UI work never waits on the native build.
 */
export class StubService implements AIService {
  readonly modelId = "stub-keywords";
  private noModel = async (): Promise<string> => {
    throw new Error("stub");
  };

  async init() {
    aiStats.loadFinished(0);
  }

  async intake(text: string): Promise<BookingCardData | null> {
    await new Promise((r) => setTimeout(r, 600)); // fake "thinking" so loading UI is visible
    const out = await runIntake(text, this.noModel);
    aiStats.record({ kind: "intake", at: Date.now(), latencyMs: out.latencyMs, source: out.source, attempts: 0 });
    return out.card;
  }

  async extractReport(text: string, bookingTask: TaskCode): Promise<ReportDraft> {
    const out = await runReportExtraction(text, bookingTask, this.noModel);
    aiStats.record({ kind: "report", at: Date.now(), latencyMs: out.latencyMs, source: out.source, attempts: 0 });
    return out.draft;
  }
}
