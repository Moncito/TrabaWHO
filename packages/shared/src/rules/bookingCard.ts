import { catalog as defaultCatalog, getService, getTask, inspectTaskFor, type Catalog } from "../catalog";
import { HAZARD_CODES, type BookingCardData, type IntakeResult } from "../schemas";
import { detectHazards } from "./fallback";
import { estimateForTask } from "./pricing";
import { safetyFor } from "./safety";
import { applyUrgencyFloor } from "./urgency";

/**
 * Plain-code safety net over the model output:
 * - task must belong to service, else fall back to <SERVICE>_INSPECT with low confidence
 * - hazards found by keywords in the original text are always added (a missed GAS_SMELL
 *   from the model must still show the safety note)
 * - urgency floors applied last
 */
export function normalizeIntake(result: IntakeResult, originalText: string, c: Catalog = defaultCatalog): IntakeResult {
  let { task, confidence } = result;
  if (getTask(task, c).service !== result.service) {
    task = inspectTaskFor(result.service);
    confidence = "low";
  }
  const found = new Set([...result.hazards, ...detectHazards(originalText, c)]);
  const hazards = HAZARD_CODES.filter((h) => found.has(h));
  return {
    ...result,
    task,
    confidence,
    hazards,
    urgency: applyUrgencyFloor(result.urgency, hazards, c),
  };
}

export function buildBookingCard(
  intake: IntakeResult,
  source: BookingCardData["source"],
  c: Catalog = defaultCatalog,
): BookingCardData {
  const task = getTask(intake.task, c);
  return {
    ...intake,
    urgency: applyUrgencyFloor(intake.urgency, intake.hazards, c),
    serviceNameTl: getService(intake.service, c).nameTl,
    taskNameTl: task.nameTl,
    ...estimateForTask(intake.task, c),
    ...safetyFor(intake.hazards, c),
    questions: task.questions.slice(0, 2),
    lowConfidence: intake.confidence === "low",
    source,
  };
}
