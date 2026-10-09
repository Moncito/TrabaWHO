import { describe, expect, it } from "vitest";
import { detectScamFlags, firstAidFor, runScamCheck, scamRisk, SERVICE_CODES, type LlmCall } from "../src";

const noModel: LlmCall = async () => {
  throw new Error("no model");
};
const replies =
  (out: string): LlmCall =>
  async () =>
    out;

describe("scam keyword rules", () => {
  it("flags the user's example messages", () => {
    expect(detectScamFlags("GCash mo na lang ako directly, cancel mo na yung booking")).toEqual(
      expect.arrayContaining(["OFF_APP_PAYMENT", "CANCEL_BOOKING"]),
    );
    expect(detectScamFlags("deposit muna bago ako pumunta")).toContain("DEPOSIT_FIRST");
  });
  it("does not flag normal messages", () => {
    for (const msg of [
      "Papunta na po ako, 10 minutes",
      "Ma'am cash na lang po pagkatapos ng trabaho",
      "Pa-pin mo naman yung location mo",
      "Send mo address mo po",
      "Sorry po, cancel ko na lang, may lakad pala ako",
    ]) {
      expect(detectScamFlags(msg), msg).toEqual([]);
    }
  });
  it("risk: any HIGH flag -> HIGH, only MEDIUM -> MEDIUM, none -> LOW", () => {
    expect(scamRisk(["PRICE_CHANGE", "DEPOSIT_FIRST"])).toBe("HIGH");
    expect(scamRisk(["URGENT_PRESSURE"])).toBe("MEDIUM");
    expect(scamRisk([])).toBe("LOW");
  });
});

describe("runScamCheck", () => {
  it("merges model flags with keyword flags", async () => {
    const r = await runScamCheck("deposit muna po, tapos may link ako ipapadala", replies('{"flags":["SUSPICIOUS_LINK"]}'));
    expect(r).toMatchObject({ source: "model", risk: "HIGH" });
    expect(r.flags).toEqual(["DEPOSIT_FIRST", "SUSPICIOUS_LINK"]);
    expect(r.warnings[0]?.title).toBeTruthy();
  });
  it("falls back to rules when the model fails", async () => {
    const r = await runScamCheck("Pakisabi yung OTP na natanggap mo", noModel);
    expect(r).toMatchObject({ source: "rules", risk: "HIGH", flags: ["ASKS_OTP_OR_PASSWORD"] });
  });
  it("normal message is LOW", async () => {
    const r = await runScamCheck("Papunta na po ako", replies('{"flags":[]}'));
    expect(r).toMatchObject({ risk: "LOW", flags: [], warnings: [] });
  });
});

describe("first aid", () => {
  it("every service has team-written steps", () => {
    for (const s of SERVICE_CODES) expect(firstAidFor(s).length).toBeGreaterThan(1);
  });
});
