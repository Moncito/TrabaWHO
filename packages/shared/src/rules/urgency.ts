import { catalog as defaultCatalog, getHazard, type Catalog } from "../catalog";
import type { HazardCode, Urgency } from "../schemas";

const RANK: Record<Urgency, number> = { SCHEDULED: 0, TODAY: 1, EMERGENCY: 2 };

export function maxUrgency(a: Urgency, b: Urgency): Urgency {
  return RANK[a] >= RANK[b] ? a : b;
}

/** SPEC 5.1 rules: hazards raise urgency to at least the hazard's floor. Never lowers it. */
export function applyUrgencyFloor(
  urgency: Urgency,
  hazards: readonly HazardCode[],
  c: Catalog = defaultCatalog,
): Urgency {
  return hazards.reduce<Urgency>((u, h) => maxUrgency(u, getHazard(h, c).urgencyFloor), urgency);
}
