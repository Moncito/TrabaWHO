import { z } from "zod";

// Code lists are hardcoded so TS gets literal types. validateCatalog() checks
// that catalog.json matches these exactly.
export const SERVICE_CODES = ["PLUMBING", "ELECTRICAL", "CARPENTRY", "AIRCON", "WELDING"] as const;

export const TASK_CODES = [
  "PLUMB_LEAK_SINK",
  "PLUMB_CLOG",
  "PLUMB_TOILET_REPAIR",
  "PLUMBING_INSPECT",
  "ELEC_OUTLET_REPAIR",
  "ELEC_BREAKER_TRIP",
  "ELEC_LIGHT_FIXTURE",
  "ELECTRICAL_INSPECT",
  "CARP_DOOR_REPAIR",
  "CARP_CABINET_REPAIR",
  "CARP_CEILING_REPAIR",
  "CARPENTRY_INSPECT",
  "AC_CLEANING",
  "AC_NOT_COLD",
  "AC_WATER_LEAK",
  "AIRCON_INSPECT",
  "WELD_GATE_REPAIR",
  "WELD_GRILL_INSTALL",
  "WELD_METAL_REPAIR",
  "WELDING_INSPECT",
] as const;

export const HAZARD_CODES = [
  "GAS_SMELL",
  "SPARKING",
  "BURNING_SMELL",
  "ACTIVE_FLOODING",
  "NO_POWER",
  "STRUCTURAL_DAMAGE",
] as const;

export const URGENCIES = ["EMERGENCY", "TODAY", "SCHEDULED"] as const;
export const CONFIDENCES = ["high", "medium", "low"] as const;
export const BOOKING_STATUSES = ["REQUESTED", "ACCEPTED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;

export const ServiceCode = z.enum(SERVICE_CODES);
export const TaskCode = z.enum(TASK_CODES);
export const HazardCode = z.enum(HAZARD_CODES);
export const Urgency = z.enum(URGENCIES);
export const Confidence = z.enum(CONFIDENCES);
export const BookingStatus = z.enum(BOOKING_STATUSES);

export type ServiceCode = z.infer<typeof ServiceCode>;
export type TaskCode = z.infer<typeof TaskCode>;
export type HazardCode = z.infer<typeof HazardCode>;
export type Urgency = z.infer<typeof Urgency>;
export type Confidence = z.infer<typeof Confidence>;
export type BookingStatus = z.infer<typeof BookingStatus>;

// ---------- AI outputs (SPEC 5.1.1, 5.3) ----------

export const IntakeResult = z.object({
  service: ServiceCode,
  task: TaskCode,
  urgency: Urgency,
  hazards: z.array(HazardCode).default([]),
  summary: z.string().trim().min(1).max(200),
  confidence: Confidence,
});
export type IntakeResult = z.infer<typeof IntakeResult>;

export const Material = z.object({
  name: z.string().trim().min(1).max(80),
  qty: z.number().positive().max(10_000),
  unit: z.string().trim().min(1).max(16),
});
export type Material = z.infer<typeof Material>;

export const ReportDraft = z.object({
  tasksDone: z.array(TaskCode).min(1),
  materials: z.array(Material).default([]),
  durationMinutes: z.number().int().positive().max(24 * 60),
  notes: z.string().trim().max(300).default(""),
});
export type ReportDraft = z.infer<typeof ReportDraft>;

// ---------- Booking Card (IntakeResult after the rules engine) ----------

export const SafetyNote = z.object({
  hazard: HazardCode,
  text: z.string(),
});
export type SafetyNote = z.infer<typeof SafetyNote>;

export const BookingCardData = IntakeResult.extend({
  serviceNameTl: z.string(),
  taskNameTl: z.string(),
  priceMin: z.number().int(),
  priceMax: z.number().int(),
  minutesMin: z.number().int(),
  minutesMax: z.number().int(),
  safetyNotes: z.array(SafetyNote),
  showEmergencyHotline: z.boolean(),
  emergencyHotline: z.string(),
  questions: z.array(z.string()),
  lowConfidence: z.boolean(),
  // "model" = LLM answer passed validation; "fallback" = keyword rules were used
  source: z.enum(["model", "fallback"]),
});
export type BookingCardData = z.infer<typeof BookingCardData>;

// ---------- API payloads (mobile -> API, also stored in the outbox) ----------

export const BookingCreate = z.object({
  clientRef: z.string().uuid(),
  serviceCode: ServiceCode,
  taskCode: TaskCode,
  urgency: Urgency,
  hazards: z.array(HazardCode),
  aiSummary: z.string().max(200),
  aiConfidence: Confidence,
  aiModel: z.string().max(64),
  editedByUser: z.boolean(),
  address: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(64),
  barangay: z.string().trim().min(1).max(64),
  createdOffline: z.boolean(),
});
export type BookingCreate = z.infer<typeof BookingCreate>;

export const PricedMaterial = Material.extend({
  unitPrice: z.number().int().min(0).max(1_000_000),
});
export type PricedMaterial = z.infer<typeof PricedMaterial>;

export const ReportCreate = z.object({
  clientRef: z.string().uuid(),
  bookingId: z.string().uuid(),
  tasksDone: z.array(TaskCode).min(1),
  materials: z.array(PricedMaterial),
  durationMinutes: z.number().int().positive().max(24 * 60),
  notes: z.string().max(300),
  createdOffline: z.boolean(),
});
export type ReportCreate = z.infer<typeof ReportCreate>;
