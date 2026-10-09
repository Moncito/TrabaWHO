/**
 * Runs eval/intake.json and eval/report.json through the same pipeline the app uses
 * (packages/shared runIntake / runReportExtraction) and prints accuracy + latency.
 *
 * Usage:
 *   npm run eval -- --backend ollama --model qwen3:1.7b
 *   npm run eval -- --backend llamacpp --url http://localhost:8080 --model qwen3-1.7b-q4
 *   npm run eval -- --backend keywords          # no model: keyword fallback baseline
 *
 * Results are written to eval/results/<model>.json. Commit them: CI does not run the model.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runIntake, runReportExtraction, type LlmCall, type TaskCode } from "@trabawho/shared";

const here = dirname(fileURLToPath(import.meta.url));

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : fallback;
}

const backend = arg("backend", "ollama")!;
const model = arg("model", backend === "keywords" ? "keywords-only" : "qwen3:1.7b")!;
const only = arg("only"); // "intake" | "report"

function ollamaBackend(url: string): LlmCall {
  return async ({ messages, jsonSchema, maxTokens }) => {
    const res = await fetch(`${url}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
        format: jsonSchema,
        think: false,
        options: { temperature: 0, num_predict: maxTokens },
      }),
    });
    if (!res.ok) throw new Error(`ollama ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { message?: { content?: string } };
    return body.message?.content ?? "";
  };
}

/** llama.cpp `llama-server` (OpenAI-compatible). Closest to llama.rn on the phone. */
function llamaCppBackend(url: string): LlmCall {
  return async ({ messages, jsonSchema, maxTokens }) => {
    const res = await fetch(`${url}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0,
        max_tokens: maxTokens,
        response_format: { type: "json_schema", json_schema: { name: "out", schema: jsonSchema } },
      }),
    });
    if (!res.ok) throw new Error(`llama.cpp ${res.status}: ${await res.text()}`);
    const body = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return body.choices?.[0]?.message?.content ?? "";
  };
}

const baseLlm: LlmCall =
  backend === "ollama"
    ? ollamaBackend(arg("url", "http://localhost:11434")!)
    : backend === "llamacpp"
      ? llamaCppBackend(arg("url", "http://localhost:8080")!)
      : async () => {
          throw new Error("keywords-only baseline");
        };

// The pipeline swallows backend errors (it falls back to keywords, as the app should).
// The eval must not: count them so a dead server can't masquerade as model results.
const backendErrors: string[] = [];
const llm: LlmCall = async (req) => {
  try {
    return await baseLlm(req);
  } catch (e) {
    if (backend !== "keywords") backendErrors.push(e instanceof Error ? e.message : String(e));
    throw e;
  }
};

async function preflight() {
  if (backend === "keywords") return;
  const url = arg("url", backend === "ollama" ? "http://localhost:11434" : "http://localhost:8080")!;
  try {
    if (backend === "ollama") {
      const res = await fetch(`${url}/api/tags`);
      const tags = (await res.json()) as { models?: { name: string }[] };
      const names = (tags.models ?? []).map((m) => m.name);
      if (!names.some((n) => n === model || n === `${model}:latest`)) {
        console.error(`Model "${model}" not pulled. Have: ${names.join(", ") || "(none)"}\nRun: ollama pull ${model}`);
        process.exit(1);
      }
    } else {
      await fetch(`${url}/health`);
    }
  } catch {
    console.error(
      `Cannot reach ${backend} at ${url}.` +
        (backend === "ollama" ? "\nStart it: open the Ollama app, or run `ollama serve` in another terminal." : ""),
    );
    process.exit(1);
  }
}

const load = <T>(name: string): T => JSON.parse(readFileSync(join(here, name), "utf8")) as T;
const pct = (n: number, d: number) => (d ? `${n}/${d} (${Math.round((100 * n) / d)}%)` : "n/a");
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

interface IntakeCase { id: string; text: string; expectedService: string; expectedTask: string; expectedHazards: string[] }
interface ReportCase {
  id: string;
  bookingTask: TaskCode;
  text: string;
  expectedTasks: string[];
  expectedMaterials: { name: string; qty: number; unit: string }[];
  expectedDuration: number;
}

async function evalIntake() {
  const cases = load<IntakeCase[]>("intake.json");
  const rows = [];
  for (const c of cases) {
    const out = await runIntake(c.text, llm);
    const card = out.card;
    const hazards = card?.hazards ?? [];
    const row = {
      id: c.id,
      source: out.source,
      latencyMs: out.latencyMs,
      service: card?.service ?? null,
      task: card?.task ?? null,
      hazards,
      serviceOk: card?.service === c.expectedService,
      taskOk: card?.task === c.expectedTask,
      hazardsOk: c.expectedHazards.every((h) => (hazards as string[]).includes(h)),
    };
    rows.push(row);
    const mark = (ok: boolean) => (ok ? "ok " : "XX ");
    console.log(
      `${c.id} ${mark(row.serviceOk)}${mark(row.taskOk)}${mark(row.hazardsOk)} ${String(row.latencyMs).padStart(6)}ms ${row.source.padEnd(8)} ${row.task ?? "-"}  (want ${c.expectedTask})`,
    );
  }
  const n = rows.length;
  const summary = {
    cases: n,
    service: pct(rows.filter((r) => r.serviceOk).length, n),
    task: pct(rows.filter((r) => r.taskOk).length, n),
    hazards: pct(rows.filter((r) => r.hazardsOk).length, n),
    fallbackUsed: rows.filter((r) => r.source !== "model").length,
    avgLatencyMs: avg(rows.map((r) => r.latencyMs)),
    maxLatencyMs: Math.max(...rows.map((r) => r.latencyMs)),
  };
  console.log("\nINTAKE", summary, "\n");
  return { summary, rows };
}

const sameMaterial = (a: string, b: string) => {
  const x = a.toLowerCase();
  const y = b.toLowerCase();
  return x.includes(y) || y.includes(x);
};

async function evalReport() {
  const cases = load<ReportCase[]>("report.json");
  const rows = [];
  for (const c of cases) {
    const out = await runReportExtraction(c.text, c.bookingTask, llm);
    const d = out.draft;
    const matched = c.expectedMaterials.filter((e) =>
      d.materials.some((m) => sameMaterial(m.name, e.name) && m.qty === e.qty),
    ).length;
    const row = {
      id: c.id,
      source: out.source,
      latencyMs: out.latencyMs,
      tasksOk: c.expectedTasks.every((t) => (d.tasksDone as string[]).includes(t)),
      materialsMatched: matched,
      materialsExpected: c.expectedMaterials.length,
      durationOk: d.durationMinutes === c.expectedDuration,
      draft: d,
    };
    rows.push(row);
    console.log(
      `${c.id} tasks:${row.tasksOk ? "ok" : "XX"} materials:${matched}/${row.materialsExpected} duration:${row.durationOk ? "ok" : `XX(${d.durationMinutes})`} ${row.latencyMs}ms ${row.source}`,
    );
  }
  const summary = {
    cases: rows.length,
    tasks: pct(rows.filter((r) => r.tasksOk).length, rows.length),
    materials: pct(
      rows.reduce((s, r) => s + r.materialsMatched, 0),
      rows.reduce((s, r) => s + r.materialsExpected, 0),
    ),
    duration: pct(rows.filter((r) => r.durationOk).length, rows.length),
    avgLatencyMs: avg(rows.map((r) => r.latencyMs)),
  };
  console.log("\nREPORT", summary, "\n");
  return { summary, rows };
}

console.log(`backend=${backend} model=${model}\n`);
await preflight();
const intake = only === "report" ? null : await evalIntake();
const report = only === "intake" ? null : await evalReport();

if (backendErrors.length) {
  console.error(`\n${backendErrors.length} model call(s) failed. First error: ${backendErrors[0]}`);
  const total = (intake?.rows.length ?? 0) + (report?.rows.length ?? 0);
  if (backendErrors.length >= total) {
    console.error("Every case failed at the backend: results NOT saved (they would only be the keyword baseline).");
    process.exit(1);
  }
}

const outDir = join(here, "results");
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `${model.replace(/[^a-z0-9.-]/gi, "_")}.json`);
writeFileSync(
  file,
  JSON.stringify({ backend, model, ranAt: new Date().toISOString(), machine: arg("machine", "laptop"), intake, report }, null, 2),
);
console.log(`saved ${file}`);
