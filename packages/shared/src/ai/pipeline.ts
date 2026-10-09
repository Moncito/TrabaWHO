import { catalog as defaultCatalog, getTask, tasksForService, type Catalog } from "../catalog";
import { buildBookingCard, normalizeIntake } from "../rules/bookingCard";
import { parseDurationMinutes } from "../rules/duration";
import { keywordIntake } from "../rules/fallback";
import { checkProblemText, hasRepairSignal } from "../rules/inputCheck";
import { IntakeResult, ReportDraft, type BookingCardData, type TaskCode } from "../schemas";
import type { z } from "zod";
import { intakeJsonSchema, reportJsonSchema } from "./jsonSchemas";
import { intakeExamples, intakeMessages, reportMessages, type ChatMessage } from "./prompts";

/**
 * One LLM call. Backends: llama.rn on the phone, Ollama / llama.cpp server on a laptop
 * (Edge mode and eval). Must return the raw text of the model's reply.
 */
export interface LlmRequest {
  messages: ChatMessage[];
  jsonSchema: object;
  maxTokens: number;
}
export type LlmCall = (req: LlmRequest) => Promise<string>;

export interface IntakeOutcome {
  /** null = nothing usable (or the model only guessed at off-topic text): UI shows the service picker. */
  card: BookingCardData | null;
  source: "model" | "fallback" | "none" | "unclear";
  attempts: number;
  latencyMs: number;
  rawOutputs: string[];
}

export interface ReportOutcome {
  draft: ReportDraft;
  source: "model" | "fallback";
  attempts: number;
  latencyMs: number;
  rawOutputs: string[];
}

/** Pull the first {...} block out of a reply (handles ```json fences and chatter). */
export function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("no JSON object in output");
  return JSON.parse(raw.slice(start, end + 1));
}

export async function callWithRetry<T>(
  llm: LlmCall,
  messages: ChatMessage[],
  jsonSchema: object,
  maxTokens: number,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  maxAttempts = 2,
): Promise<{ value: T | null; attempts: number; rawOutputs: string[] }> {
  const rawOutputs: string[] = [];
  let convo = messages;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let raw = "";
    let error: string;
    try {
      raw = await llm({ messages: convo, jsonSchema, maxTokens });
      rawOutputs.push(raw);
      const parsed = schema.safeParse(extractJson(raw));
      if (parsed.success) return { value: parsed.data, attempts: attempt, rawOutputs };
      error = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
    convo = [
      ...messages,
      { role: "assistant", content: raw || "(no answer)" },
      { role: "user", content: `That answer was invalid (${error}). Reply again with valid JSON only.` },
    ];
  }
  return { value: null, attempts: maxAttempts, rawOutputs };
}

/** ARCHITECTURE 3.3: prompt -> LLM -> Zod -> retry once -> keyword fallback -> rules engine. */
export async function runIntake(text: string, llm: LlmCall, c: Catalog = defaultCatalog): Promise<IntakeOutcome> {
  const started = Date.now();
  // The UI checks first; this keeps nonsense away from the model for any other caller too.
  if (!checkProblemText(text, c).ok) return { card: null, source: "unclear", attempts: 0, latencyMs: 0, rawOutputs: [] };
  const { value, attempts, rawOutputs } = await callWithRetry(
    llm,
    intakeMessages(text, c),
    intakeJsonSchema,
    160,
    IntakeResult,
  );
  const done = (card: BookingCardData | null, source: IntakeOutcome["source"]): IntakeOutcome => ({
    card,
    source,
    attempts,
    latencyMs: Date.now() - started,
    rawOutputs,
  });

  if (value) {
    if (isUnfoundedGuess(value, text, c)) return done(null, "unclear");
    return done(buildBookingCard(normalizeIntake(value, text, c), "model", c), "model");
  }

  const fallback = keywordIntake(text, c);
  if (fallback) return done(buildBookingCard(normalizeIntake(fallback, text, c), "fallback", c), "fallback");
  return done(null, "none");
}

const exampleSummaries = new Set(intakeExamples.map((e) => (e.answer as { summary: string }).summary));

/**
 * The model must always pick a task, so off-topic text ("hello how are you") still gets one.
 * With no repair or hazard word in the client's text, distrust a low-confidence answer, and one
 * that copies a prompt example (on the phone, "asdsadasdasd" came back as the gas example).
 */
function isUnfoundedGuess(value: z.infer<typeof IntakeResult>, text: string, c: Catalog): boolean {
  if (hasRepairSignal(text, c)) return false;
  return value.confidence === "low" || exampleSummaries.has(value.summary);
}

function fallbackReport(text: string, bookingTask: TaskCode, c: Catalog): ReportDraft {
  const minutes = parseDurationMinutes(text) ?? getTask(bookingTask, c).minutesMin;
  return { tasksDone: [bookingTask], materials: [], durationMinutes: minutes, notes: text.trim().slice(0, 300) };
}

/**
 * Code-side cleanup of the model's tasks: the booked task always comes first (worker can
 * remove extras in the form), and <SERVICE>_INSPECT is dropped when a real task is present.
 */
function cleanTasks(modelTasks: TaskCode[], bookingTask: TaskCode, allowed: TaskCode[]): TaskCode[] {
  const tasks = [...new Set([bookingTask, ...modelTasks.filter((t) => allowed.includes(t))])];
  const specific = tasks.filter((t) => !t.endsWith("_INSPECT"));
  return specific.length ? specific : tasks;
}

/** SPEC 5.3: worker text -> ReportDraft. Tasks are limited to the booking's service. */
export async function runReportExtraction(
  text: string,
  bookingTask: TaskCode,
  llm: LlmCall,
  c: Catalog = defaultCatalog,
): Promise<ReportOutcome> {
  const started = Date.now();
  const service = getTask(bookingTask, c).service;
  const allowed = tasksForService(service, c).map((t) => t.code);
  const { value, attempts, rawOutputs } = await callWithRetry(
    llm,
    reportMessages(text, service, c),
    reportJsonSchema(allowed),
    300,
    ReportDraft,
  );
  const base = { attempts, latencyMs: 0, rawOutputs };

  if (value) {
    const draft: ReportDraft = {
      ...value,
      tasksDone: cleanTasks(value.tasksDone, bookingTask, allowed),
      // Stated durations are parsed by code; the model's number is only used when none is stated.
      durationMinutes: parseDurationMinutes(text) ?? value.durationMinutes,
    };
    return { ...base, draft, source: "model", latencyMs: Date.now() - started };
  }
  return { ...base, draft: fallbackReport(text, bookingTask, c), source: "fallback", latencyMs: Date.now() - started };
}
