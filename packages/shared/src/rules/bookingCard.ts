import { catalog as defaultCatalog, getService, getTask, inspectTaskFor, type Catalog } from "../catalog";
import { HAZARD_CODES, type BookingCardData, type HazardCode, type IntakeResult } from "../schemas";
import { detectHazards } from "./fallback";
import { estimateForTask } from "./pricing";
import { safetyFor } from "./safety";
import { applyUrgencyFloor } from "./urgency";

/**
 * Life-threatening hazards are trusted from the model alone (a false alarm is acceptable).
 * The rest must be backed by words in the client's text: on the phone the model added
 * ACTIVE_FLOODING to "May tulo sa ilalim ng lababo namin", turning a small leak into an emergency.
 */
const TRUST_MODEL_ALONE: ReadonlySet<HazardCode> = new Set(["GAS_SMELL", "SPARKING", "BURNING_SMELL"]);

/**
 * Plain-code safety net over the model output:
 * - task must belong to service, else fall back to <SERVICE>_INSPECT with low confidence
 * - hazards found by keywords in the original text are always added (a missed GAS_SMELL
 *   from the model must still show the safety note)
 * - model-only hazards outside TRUST_MODEL_ALONE are dropped
 * - EMERGENCY needs a hazard; without one the model's urgency is capped at TODAY
 * - urgency floors applied last
 */
export function normalizeIntake(result: IntakeResult, originalText: string, c: Catalog = defaultCatalog): IntakeResult {
  let { task, confidence } = result;
  if (getTask(task, c).service !== result.service) {
    task = inspectTaskFor(result.service);
    confidence = "low";
  }
  const fromText = detectHazards(originalText, c);
  const fromModel = result.hazards.filter((h) => TRUST_MODEL_ALONE.has(h) || fromText.includes(h));
  const found = new Set([...fromModel, ...fromText]);
  const hazards = HAZARD_CODES.filter((h) => found.has(h));
  const modelUrgency = result.urgency === "EMERGENCY" && hazards.length === 0 ? "TODAY" : result.urgency;
  return {
    ...result,
    task,
    confidence,
    hazards,
    urgency: applyUrgencyFloor(modelUrgency, hazards, c),
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
