import { describe, expect, it } from "vitest";
import { extractJson, runIntake, runReportExtraction, type LlmCall } from "../src";

const replies = (...outputs: string[]): LlmCall => {
  let i = 0;
  return async () => outputs[Math.min(i++, outputs.length - 1)] ?? "";
};

const good = JSON.stringify({
  service: "PLUMBING",
  task: "PLUMB_LEAK_SINK",
  urgency: "SCHEDULED",
  hazards: [],
  summary: "Tumutulo ang gripo.",
  confidence: "high",
});

describe("extractJson", () => {
  it("handles fences and chatter", () => {
    expect(extractJson('Sure!\n```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });
});

describe("runIntake", () => {
  it("uses the model answer when valid", async () => {
    const out = await runIntake("tumutulo gripo", replies(good));
    expect(out).toMatchObject({ source: "model", attempts: 1 });
    expect(out.card?.task).toBe("PLUMB_LEAK_SINK");
  });
  it("retries once after invalid output", async () => {
    const out = await runIntake("tumutulo gripo", replies("not json", good));
    expect(out).toMatchObject({ source: "model", attempts: 2 });
  });
  it("falls back to keywords after two failures", async () => {
    const out = await runIntake("barado ang lababo", replies("x", '{"service":"NOPE"}'));
    expect(out.source).toBe("fallback");
    expect(out.card).toMatchObject({ service: "PLUMBING", task: "PLUMB_CLOG", lowConfidence: true });
  });
  it("survives a throwing backend", async () => {
    const out = await runIntake("barado ang lababo", async () => {
      throw new Error("model not loaded");
    });
    expect(out.source).toBe("fallback");
  });
  it("returns null card when nothing works", async () => {
    const out = await runIntake("hello po, kumusta kayo", replies("x"));
    expect(out).toMatchObject({ card: null, source: "none" });
  });
  it("never sends keyboard mashing to the model", async () => {
    let called = false;
    const out = await runIntake("asdsadasdasd", async () => {
      called = true;
      return good;
    });
    expect(out).toMatchObject({ card: null, source: "unclear" });
    expect(called).toBe(false);
  });
  it("drops a copied prompt example when the text has no repair words", async () => {
    const copied = JSON.stringify({ service: "PLUMBING", task: "PLUMBING_INSPECT", urgency: "EMERGENCY", hazards: ["GAS_SMELL"], summary: "Amoy gas sa kusina.", confidence: "medium" });
    const out = await runIntake("hello how are you", replies(copied));
    expect(out).toMatchObject({ card: null, source: "unclear" });
  });
  it("drops a low-confidence guess at off-topic text", async () => {
    const guess = JSON.stringify({ service: "CARPENTRY", task: "CARPENTRY_INSPECT", urgency: "SCHEDULED", hazards: [], summary: "Ano ang ulam.", confidence: "low" });
    expect((await runIntake("ano ulam mamaya", replies(guess))).source).toBe("unclear");
  });
  it("keeps a low-confidence answer when the text names a repair", async () => {
    const low = JSON.stringify({ ...JSON.parse(good), confidence: "low" });
    expect((await runIntake("tumutulo gripo", replies(low))).source).toBe("model");
  });
});

describe("runReportExtraction", () => {
  it("keeps only tasks from the booking's service", async () => {
    const reply = JSON.stringify({
      tasksDone: ["PLUMB_CLOG", "ELEC_OUTLET_REPAIR"],
      materials: [{ name: "Wire", qty: 2, unit: "m" }],
      durationMinutes: 45,
      notes: "ok",
    });
    const out = await runReportExtraction("...", "ELEC_OUTLET_REPAIR", replies(reply));
    expect(out.draft.tasksDone).toEqual(["ELEC_OUTLET_REPAIR"]);
  });
  it("fallback reads duration from text", async () => {
    const out = await runReportExtraction("pinalitan outlet, 2 oras", "ELEC_OUTLET_REPAIR", replies("x"));
    expect(out).toMatchObject({ source: "fallback", draft: { durationMinutes: 120, tasksDone: ["ELEC_OUTLET_REPAIR"] } });
  });
});
