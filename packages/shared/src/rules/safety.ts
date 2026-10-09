import { catalog as defaultCatalog, getHazard, type Catalog } from "../catalog";
import { HAZARD_CODES, type HazardCode, type SafetyNote } from "../schemas";

export interface SafetyInfo {
  safetyNotes: SafetyNote[];
  showEmergencyHotline: boolean;
  emergencyHotline: string;
}

/** Pre-written safety notes only (never AI text). Ordered by catalog severity order. */
export function safetyFor(hazards: readonly HazardCode[], c: Catalog = defaultCatalog): SafetyInfo {
  const unique = HAZARD_CODES.filter((h) => hazards.includes(h));
  const list = unique.map((h) => getHazard(h, c));
  return {
    safetyNotes: list.map((h) => ({ hazard: h.code, text: h.safetyNoteTl })),
    showEmergencyHotline: list.some((h) => h.showHotline),
    emergencyHotline: c.emergencyHotline,
  };
}
