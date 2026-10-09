import { z } from "zod";
import rawCatalog from "../catalog.json";
import {
  HAZARD_CODES,
  HazardCode,
  SERVICE_CODES,
  ServiceCode,
  TASK_CODES,
  TaskCode,
  Urgency,
} from "./schemas";

const CatalogService = z.object({
  code: ServiceCode,
  nameTl: z.string().min(1),
  nameEn: z.string().min(1),
  keywords: z.array(z.string()),
});

const CatalogTask = z.object({
  code: TaskCode,
  service: ServiceCode,
  nameTl: z.string().min(1),
  nameEn: z.string().min(1),
  promptHint: z.string().min(1),
  priceMin: z.number().int().positive(),
  priceMax: z.number().int().positive(),
  minutesMin: z.number().int().positive(),
  minutesMax: z.number().int().positive(),
  questions: z.array(z.string().min(1)).min(1).max(3),
  keywords: z.array(z.string()),
});

const CatalogHazard = z.object({
  code: HazardCode,
  /** Used by the keyword fallback when a hazard is found but no service keyword matches. */
  defaultService: ServiceCode,
  nameTl: z.string().min(1),
  nameEn: z.string().min(1),
  urgencyFloor: Urgency,
  showHotline: z.boolean(),
  safetyNoteTl: z.string().min(1),
  keywords: z.array(z.string()),
});

export const CatalogSchema = z.object({
  version: z.number().int().positive(),
  currency: z.literal("PHP"),
  pricesAreIllustrative: z.boolean(),
  emergencyHotline: z.string().min(1),
  services: z.array(CatalogService),
  tasks: z.array(CatalogTask),
  hazards: z.array(CatalogHazard),
});

export type Catalog = z.infer<typeof CatalogSchema>;
export type CatalogService = z.infer<typeof CatalogService>;
export type CatalogTask = z.infer<typeof CatalogTask>;
export type CatalogHazard = z.infer<typeof CatalogHazard>;

/** Returns a list of problems; empty list means the catalog is valid. */
export function validateCatalog(input: unknown): string[] {
  const parsed = CatalogSchema.safeParse(input);
  if (!parsed.success) {
    return parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
  }
  const c = parsed.data;
  const errors: string[] = [];

  const sameSet = (label: string, actual: string[], expected: readonly string[]) => {
    const dupes = actual.filter((x, i) => actual.indexOf(x) !== i);
    if (dupes.length) errors.push(`${label}: duplicate codes ${dupes.join(", ")}`);
    const missing = expected.filter((x) => !actual.includes(x));
    if (missing.length) errors.push(`${label}: missing codes ${missing.join(", ")}`);
  };
  sameSet("services", c.services.map((s) => s.code), SERVICE_CODES);
  sameSet("tasks", c.tasks.map((t) => t.code), TASK_CODES);
  sameSet("hazards", c.hazards.map((h) => h.code), HAZARD_CODES);

  for (const t of c.tasks) {
    if (t.priceMin > t.priceMax) errors.push(`${t.code}: priceMin > priceMax`);
    if (t.minutesMin > t.minutesMax) errors.push(`${t.code}: minutesMin > minutesMax`);
  }
  for (const s of SERVICE_CODES) {
    const inspect = `${s}_INSPECT`;
    const task = c.tasks.find((t) => t.code === inspect);
    if (!task) errors.push(`${s}: missing ${inspect} task`);
    else if (task.service !== s) errors.push(`${inspect}: wrong service ${task.service}`);
  }
  if (!c.hazards.find((h) => h.code === "GAS_SMELL")?.showHotline) {
    errors.push("GAS_SMELL must have showHotline: true (SPEC 5.1)");
  }
  return errors;
}

function loadCatalog(): Catalog {
  const errors = validateCatalog(rawCatalog);
  if (errors.length) throw new Error(`Invalid catalog.json:\n${errors.join("\n")}`);
  return CatalogSchema.parse(rawCatalog);
}

export const catalog: Catalog = loadCatalog();

export function getTask(code: TaskCode, c: Catalog = catalog): CatalogTask {
  const task = c.tasks.find((t) => t.code === code);
  if (!task) throw new Error(`Unknown task ${code}`);
  return task;
}

export function getService(code: ServiceCode, c: Catalog = catalog): CatalogService {
  const service = c.services.find((s) => s.code === code);
  if (!service) throw new Error(`Unknown service ${code}`);
  return service;
}

export function getHazard(code: HazardCode, c: Catalog = catalog): CatalogHazard {
  const hazard = c.hazards.find((h) => h.code === code);
  if (!hazard) throw new Error(`Unknown hazard ${code}`);
  return hazard;
}

export function inspectTaskFor(service: ServiceCode): TaskCode {
  return `${service}_INSPECT` as TaskCode;
}

export function tasksForService(service: ServiceCode, c: Catalog = catalog): CatalogTask[] {
  return c.tasks.filter((t) => t.service === service);
}
