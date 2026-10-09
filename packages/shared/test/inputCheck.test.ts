import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkProblemText, checkReportText, MAX_INPUT_CHARS } from "../src";

const load = (f: string) => JSON.parse(readFileSync(new URL(`../../../eval/${f}`, import.meta.url), "utf8")) as { text: string }[];
const problem = (t: string) => {
  const r = checkProblemText(t);
  return r.ok ? "ok" : r.problem;
};

describe("checkProblemText", () => {
  it.each(["asdsadasdasd", "qwerty", "jkjkjkjk", "hahahaha", "fsdfsdf sdfsdf", "aaaaaaa", "brrrr", "lkjhgf poiuy"])("blocks mashing: %s", (t) => {
    expect(problem(t)).toBe("gibberish");
  });
  it.each(["asd", "hello", "ok po", "12345", "!!!!", ""])("asks for more words: %j", (t) => {
    expect(problem(t)).toBe("too_short");
  });
  it("caps the length", () => {
    expect(problem("tumutulo ang gripo ".repeat(40))).toBe("too_long");
    expect(MAX_INPUT_CHARS).toBe(500);
  });
  it.each(["gas!!", "tulo", "may sira", "sira-sira ang pinto", "hello how are you"])("lets through: %s", (t) => {
    expect(problem(t)).toBe("ok");
  });
  it("accepts every eval problem", () => {
    for (const f of ["intake.json", "heldout.json", "demo.json", "demo-spark.json"]) {
      for (const { text } of load(f)) expect([f, problem(text)]).toEqual([f, "ok"]);
    }
  });
});

describe("checkReportText", () => {
  it("accepts every eval report and blocks mashing", () => {
    for (const { text } of load("report.json")) expect(checkReportText(text).ok).toBe(true);
    expect(checkReportText("asdasdasd sdfsdf").ok).toBe(false);
    expect(checkReportText("ok").ok).toBe(false);
  });
});
