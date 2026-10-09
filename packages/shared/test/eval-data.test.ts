import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { getTask, HazardCode, intakeExamples, ServiceCode, TaskCode } from "../src";

const load = (name: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`../../../eval/${name}`, import.meta.url)), "utf8")) as Record<string, unknown>[];

describe("eval data matches catalog", () => {
  it("intake.json codes are valid and task matches service", () => {
    for (const c of load("intake.json")) {
      const task = TaskCode.parse(c.expectedTask);
      expect(getTask(task).service, String(c.id)).toBe(ServiceCode.parse(c.expectedService));
      for (const h of c.expectedHazards as string[]) HazardCode.parse(h);
    }
  });
  it("intake.json does not reuse few-shot examples", () => {
    const shots = new Set(intakeExamples.map((e) => e.text.toLowerCase()));
    for (const c of load("intake.json")) expect(shots.has(String(c.text).toLowerCase())).toBe(false);
  });
  it("report.json codes are valid", () => {
    for (const c of load("report.json")) {
      TaskCode.parse(c.bookingTask);
      for (const t of c.expectedTasks as string[]) TaskCode.parse(t);
    }
  });
});
