import { catalog as defaultCatalog, inspectTaskFor, tasksForService, type Catalog } from "../catalog";
import type { HazardCode, IntakeResult, ServiceCode, Urgency } from "../schemas";
import { countKeywords, normalizeText, containsKeyword } from "./text";

const TODAY_WORDS = ["ngayon", "agad", "asap", "urgent", "emergency", "madalian", "kaagad", "now", "today", "mamaya"];

export function detectHazards(text: string, c: Catalog = defaultCatalog): HazardCode[] {
  const t = normalizeText(text);
  return c.hazards.filter((h) => h.keywords.some((kw) => containsKeyword(t, kw))).map((h) => h.code);
}

/**
 * Keyword rules used when the model fails validation twice (ARCHITECTURE 3.3).
 * Returns null when no service keyword matches; the UI then shows the service picker.
 */
export function keywordIntake(text: string, c: Catalog = defaultCatalog): IntakeResult | null {
  const t = normalizeText(text);
  if (!t) return null;

  let best: { service: ServiceCode; score: number } | null = null;
  for (const s of c.services) {
    // task keywords count double: they are more specific than service keywords
    const taskScore = tasksForService(s.code, c).reduce((n, task) => n + countKeywords(t, task.keywords), 0);
    const score = countKeywords(t, s.keywords) + 2 * taskScore;
    if (score > 0 && (!best || score > best.score)) best = { service: s.code, score };
  }

  const hazards = detectHazards(text, c);
  // A hazard with no service keyword must still produce a card, or its safety note is lost.
  if (!best && hazards[0]) {
    const hazard = c.hazards.find((h) => h.code === hazards[0]);
    if (hazard) best = { service: hazard.defaultService, score: 0 };
  }
  if (!best) return null;

  let task = inspectTaskFor(best.service);
  let taskScore = 0;
  for (const candidate of tasksForService(best.service, c)) {
    const score = countKeywords(t, candidate.keywords);
    if (score > taskScore) {
      task = candidate.code;
      taskScore = score;
    }
  }

  const urgency: Urgency = TODAY_WORDS.some((w) => containsKeyword(t, w)) ? "TODAY" : "SCHEDULED";

  return {
    service: best.service,
    task,
    urgency,
    hazards,
    summary: text.trim().slice(0, 200),
    confidence: "low",
  };
}
