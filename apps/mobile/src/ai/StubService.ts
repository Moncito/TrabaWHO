import {
  runIntake,
  runReportExtraction,
  type AIService,
  type BookingCardData,
  type ReportDraft,
  type TaskCode,
} from "@trabawho/shared";

/**
 * No model: always uses the keyword fallback + rules engine. Works in Expo Go and on web,
 * so UI work never waits on the native build.
 */
export class StubService implements AIService {
  readonly modelId = "stub-keywords";
  private noModel = async (): Promise<string> => {
    throw new Error("stub");
  };

  async init() {}

  async intake(text: string): Promise<BookingCardData | null> {
    await new Promise((r) => setTimeout(r, 600)); // fake "thinking" so loading UI is visible
    return (await runIntake(text, this.noModel)).card;
  }

  async extractReport(text: string, bookingTask: TaskCode): Promise<ReportDraft> {
    return (await runReportExtraction(text, bookingTask, this.noModel)).draft;
  }
}
