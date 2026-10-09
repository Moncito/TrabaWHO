import { describe, expect, it } from "vitest";
import { runIntake, type LlmCall, type LlmRequest } from "../src";

const step1 = (task: string, service = "AIRCON") =>
  JSON.stringify({ service, task, urgency: "SCHEDULED", hazards: [], summary: "Hindi lumalamig ang aircon.", confidence: "medium" });

/** Fake model: step-1 answer for the intake schema, `step2` for the task-choice schema. Records requests. */
function fake(step1Reply: string, step2: string | (() => Promise<string>)) {
  const requests: LlmRequest[] = [];
  const llm: LlmCall = async (req) => {
    requests.push(req);
    const props = (req.jsonSchema as { properties: Record<string, unknown> }).properties;
    if (Object.keys(props).length === 1) return typeof step2 === "string" ? step2 : step2();
    return step1Reply;
  };
  return { llm, requests };
}

const step2Enum = (req: LlmRequest) =>
  (req.jsonSchema as { properties: { task: { enum: string[] } } }).properties.task.enum;

describe("runIntake two-step", () => {
  it("is off by default (one call)", async () => {
    const { llm, requests } = fake(step1("AIRCON_INSPECT"), '{"task":"AC_NOT_COLD"}');
    const out = await runIntake("hindi na lumalamig yung aircon", llm);
    expect(requests).toHaveLength(1);
    expect(out.card?.task).toBe("AIRCON_INSPECT");
  });

  for (const mode of ["compact", "followup"] as const) {
    it(`${mode}: step 2 gets only the service's 4 codes and overrides the task`, async () => {
      const { llm, requests } = fake(step1("AIRCON_INSPECT"), '{"task":"AC_NOT_COLD"}');
      const out = await runIntake("hindi na lumalamig yung aircon", llm, undefined, { twoStep: mode });
      expect(requests).toHaveLength(2);
      expect(step2Enum(requests[1]!).sort()).toEqual(["AC_CLEANING", "AC_NOT_COLD", "AC_WATER_LEAK", "AIRCON_INSPECT"]);
      expect(requests[1]!.maxTokens).toBeLessThanOrEqual(20);
      expect(out).toMatchObject({ source: "model", card: { service: "AIRCON", task: "AC_NOT_COLD" } });
      expect(out.rawOutputs).toHaveLength(2);
    });
  }

  it("compact step 2 prompt lists only that service's tasks", async () => {
    const { llm, requests } = fake(step1("AIRCON_INSPECT"), '{"task":"AC_NOT_COLD"}');
    await runIntake("aircon", llm, undefined, { twoStep: true });
    const prompt = requests[1]!.messages.map((m) => m.content).join("\n");
    expect(prompt).toContain("AC_WATER_LEAK");
    expect(prompt).not.toMatch(/PLUMB_|ELEC_|CARP_|WELD_/);
  });

  it("followup step 2 keeps the step-1 messages as an identical prefix", async () => {
    const { llm, requests } = fake(step1("AIRCON_INSPECT"), '{"task":"AC_NOT_COLD"}');
    await runIntake("aircon", llm, undefined, { twoStep: "followup" });
    expect(requests[1]!.messages.slice(0, requests[0]!.messages.length)).toEqual(requests[0]!.messages);
  });

  it("invalid step-2 output keeps the step-1 task", async () => {
    const { llm } = fake(step1("AC_CLEANING"), "garbage");
    const out = await runIntake("linis aircon", llm, undefined, { twoStep: true });
    expect(out.card?.task).toBe("AC_CLEANING");
  });

  it("step-2 code from another service is ignored", async () => {
    const { llm } = fake(step1("AC_CLEANING"), '{"task":"PLUMB_CLOG"}');
    const out = await runIntake("linis aircon", llm, undefined, { twoStep: true });
    expect(out.card?.task).toBe("AC_CLEANING");
  });

  it("throwing step 2 with a wrong-service step-1 task falls back to <SERVICE>_INSPECT", async () => {
    const { llm } = fake(step1("PLUMB_CLOG"), async () => {
      throw new Error("boom");
    });
    const out = await runIntake("aircon", llm, undefined, { twoStep: true });
    expect(out).toMatchObject({ source: "model", card: { service: "AIRCON", task: "AIRCON_INSPECT", lowConfidence: true } });
  });

  it("keyword fallback path is unchanged (no step 2 when step 1 fails)", async () => {
    const { llm, requests } = fake("x", '{"task":"PLUMB_LEAK_SINK"}');
    const out = await runIntake("barado ang lababo", llm, undefined, { twoStep: true });
    expect(out.source).toBe("fallback");
    expect(out.card?.task).toBe("PLUMB_CLOG");
    expect(requests).toHaveLength(2); // step 1 + its retry only
  });

  it("hazard rules still apply after step 2", async () => {
    const reply = JSON.stringify({ service: "PLUMBING", task: "PLUMBING_INSPECT", urgency: "TODAY", hazards: [], summary: "Amoy gas.", confidence: "low" });
    const { llm } = fake(reply, '{"task":"PLUMBING_INSPECT"}');
    const out = await runIntake("amoy gas sa kusina", llm, undefined, { twoStep: true });
    expect(out.card).toMatchObject({ hazards: ["GAS_SMELL"], urgency: "EMERGENCY" });
  });
});
