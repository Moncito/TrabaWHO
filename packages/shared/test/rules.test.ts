import { describe, expect, it } from "vitest";
import {
  applyUrgencyFloor,
  buildBookingCard,
  computeReportTotals,
  detectHazards,
  keywordIntake,
  laborForTask,
  normalizeIntake,
  safetyFor,
  type IntakeResult,
} from "../src";

describe("urgency floors", () => {
  it("raises to EMERGENCY for dangerous hazards", () => {
    for (const h of ["GAS_SMELL", "SPARKING", "BURNING_SMELL", "ACTIVE_FLOODING"] as const) {
      expect(applyUrgencyFloor("SCHEDULED", [h])).toBe("EMERGENCY");
    }
  });
  it("raises other hazards to at least TODAY", () => {
    expect(applyUrgencyFloor("SCHEDULED", ["NO_POWER"])).toBe("TODAY");
    expect(applyUrgencyFloor("SCHEDULED", ["STRUCTURAL_DAMAGE"])).toBe("TODAY");
  });
  it("never lowers urgency", () => {
    expect(applyUrgencyFloor("EMERGENCY", ["NO_POWER"])).toBe("EMERGENCY");
    expect(applyUrgencyFloor("TODAY", [])).toBe("TODAY");
  });
});

describe("safety", () => {
  it("GAS_SMELL always shows the hotline", () => {
    const s = safetyFor(["GAS_SMELL"]);
    expect(s.showEmergencyHotline).toBe(true);
    expect(s.emergencyHotline).toBe("911");
    expect(s.safetyNotes[0]?.text).toMatch(/911/);
  });
  it("no hazards, no notes", () => {
    expect(safetyFor([])).toMatchObject({ safetyNotes: [], showEmergencyHotline: false });
  });
});

describe("pricing", () => {
  it("labor is catalog midpoint", () => {
    expect(laborForTask("ELEC_OUTLET_REPAIR")).toBe(650);
  });
  it("totals = labor + materials", () => {
    const t = computeReportTotals(["ELEC_OUTLET_REPAIR"], [
      { qty: 1, unitPrice: 120 },
      { qty: 2, unitPrice: 35 },
    ]);
    expect(t).toEqual({ laborCost: 650, materialsCost: 190, total: 840 });
  });
  it("duplicate tasks are not double-charged", () => {
    expect(computeReportTotals(["PLUMB_CLOG", "PLUMB_CLOG"], []).laborCost).toBe(laborForTask("PLUMB_CLOG"));
  });
});

describe("keyword fallback", () => {
  it("classifies a sparking outlet", () => {
    const r = keywordIntake("Ayaw gumana ng saksakan, nag-spark kanina");
    expect(r).toMatchObject({ service: "ELECTRICAL", task: "ELEC_OUTLET_REPAIR", confidence: "low" });
    expect(r?.hazards).toContain("SPARKING");
  });
  it("regional sparking words are hazards (added after held-out h11)", () => {
    expect(detectHazards("dumidiklap yung saksakan namin")).toContain("SPARKING");
    expect(detectHazards("dumidikilap ang outlet")).toContain("SPARKING");
  });
  it("short keywords only match whole words", () => {
    expect(keywordIntake("sira ang ac namin")?.service).toBe("AIRCON");
    expect(detectHazards("nagbabasa ng libro")).toEqual([]);
  });
  it("aircon leak goes to aircon, not plumbing", () => {
    expect(keywordIntake("tumutulo yung aircon sa kwarto")).toMatchObject({ service: "AIRCON", task: "AC_WATER_LEAK" });
  });
  it("hazard with no service keyword still yields a card (safety note must show)", () => {
    const r = keywordIntake("may naaamoy akong gas");
    expect(r).toMatchObject({ service: "PLUMBING", task: "PLUMBING_INSPECT", hazards: ["GAS_SMELL"] });
  });
  it("returns null when nothing matches", () => {
    expect(keywordIntake("hello po")).toBeNull();
  });
});

describe("normalizeIntake + booking card", () => {
  const base: IntakeResult = {
    service: "ELECTRICAL",
    task: "ELEC_OUTLET_REPAIR",
    urgency: "SCHEDULED",
    hazards: [],
    summary: "test",
    confidence: "high",
  };
  it("task from another service becomes <SERVICE>_INSPECT with low confidence", () => {
    const n = normalizeIntake({ ...base, task: "PLUMB_CLOG" }, "");
    expect(n).toMatchObject({ task: "ELECTRICAL_INSPECT", confidence: "low" });
  });
  it("adds keyword hazards the model missed and applies floors", () => {
    const n = normalizeIntake(base, "amoy gas dito sa kusina");
    expect(n.hazards).toContain("GAS_SMELL");
    expect(n.urgency).toBe("EMERGENCY");
    const card = buildBookingCard(n, "model");
    expect(card.showEmergencyHotline).toBe(true);
  });
  it("card prices come from the catalog", () => {
    const card = buildBookingCard(base, "model");
    expect(card).toMatchObject({ priceMin: 400, priceMax: 900, lowConfidence: false });
    expect(card.questions.length).toBeGreaterThan(0);
  });
});
