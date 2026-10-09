import { CONFIDENCES, HAZARD_CODES, SERVICE_CODES, TASK_CODES, URGENCIES, type TaskCode } from "../schemas";

// Plain JSON Schema objects for grammar-constrained decoding (llama.rn response_format,
// llama.cpp server json_schema, Ollama `format`). Keep in sync with schemas.ts; the Zod
// schemas still validate every answer after decoding.

export const intakeJsonSchema = {
  type: "object",
  properties: {
    service: { type: "string", enum: [...SERVICE_CODES] },
    task: { type: "string", enum: [...TASK_CODES] },
    urgency: { type: "string", enum: [...URGENCIES] },
    hazards: { type: "array", items: { type: "string", enum: [...HAZARD_CODES] } },
    summary: { type: "string" },
    confidence: { type: "string", enum: [...CONFIDENCES] },
  },
  required: ["service", "task", "urgency", "hazards", "summary", "confidence"],
  additionalProperties: false,
} as const;

/** Step-2 schema: one task code, limited to the chosen service's tasks. */
export function taskChoiceJsonSchema(allowedTasks: readonly TaskCode[]) {
  return {
    type: "object",
    properties: { task: { type: "string", enum: [...allowedTasks] } },
    required: ["task"],
    additionalProperties: false,
  } as const;
}

export function reportJsonSchema(allowedTasks: readonly TaskCode[] = TASK_CODES) {
  return {
    type: "object",
    properties: {
      tasksDone: { type: "array", items: { type: "string", enum: [...allowedTasks] }, minItems: 1 },
      materials: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            qty: { type: "number" },
            unit: { type: "string" },
          },
          required: ["name", "qty", "unit"],
          additionalProperties: false,
        },
      },
      durationMinutes: { type: "integer" },
      notes: { type: "string" },
    },
    required: ["tasksDone", "materials", "durationMinutes", "notes"],
    additionalProperties: false,
  } as const;
}
