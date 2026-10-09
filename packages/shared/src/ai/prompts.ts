import { catalog as defaultCatalog, tasksForService, type Catalog } from "../catalog";
import type { ServiceCode } from "../schemas";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// ---------- Intake ----------

function compactTaskList(c: Catalog): string {
  return c.services
    .map((s) => `${s.code}:\n${tasksForService(s.code, c).map((t) => `  ${t.code}: ${t.promptHint}`).join("\n")}`)
    .join("\n");
}

export function intakeSystemPrompt(c: Catalog = defaultCatalog): string {
  return `You classify home-repair problems written in Taglish, Filipino or English for a booking app in the Philippines.
Reply with ONE JSON object only. No extra text.

Fields:
- service: one of ${c.services.map((s) => s.code).join(", ")}
- task: one task code listed under the chosen service below. Match the broken thing the client names (saksakan = outlet, ilaw = light, pinto = door, kisame = ceiling, kabinet = cabinet). Use <SERVICE>_INSPECT only when the client does not say what is broken.
- urgency: EMERGENCY (danger now: gas, sparks, fire, flooding), TODAY (broken and needed today), SCHEDULED (can wait)
- hazards: zero or more of ${c.hazards.map((h) => h.code).join(", ")}. Only include a hazard the client clearly describes.
- summary: one short sentence describing the problem, in the client's language. Do not give advice.
- confidence: high, medium or low

Tasks:
${compactTaskList(c)}`;
}

/** Few-shot examples. Do NOT copy these into eval/intake.json (keeps the eval honest). */
export const intakeExamples: { text: string; answer: object }[] = [
  {
    text: "Ayaw gumana ng saksakan sa kusina, nag-spark kanina",
    answer: { service: "ELECTRICAL", task: "ELEC_OUTLET_REPAIR", urgency: "EMERGENCY", hazards: ["SPARKING"], summary: "Saksakan sa kusina, ayaw gumana at nag-spark.", confidence: "high" },
  },
  {
    text: "barado yung CR namin, ayaw bumaba ng tubig pag nag flush",
    answer: { service: "PLUMBING", task: "PLUMB_CLOG", urgency: "TODAY", hazards: [], summary: "Baradong inidoro, hindi bumababa ang tubig.", confidence: "high" },
  },
  {
    text: "yung aircon sa kwarto umaandar naman pero hindi malamig",
    answer: { service: "AIRCON", task: "AC_NOT_COLD", urgency: "SCHEDULED", hazards: [], summary: "Umaandar ang aircon pero hindi lumalamig.", confidence: "high" },
  },
  {
    text: "sira yung gate namin, natanggal yung isang bisagra kaya sumasayad",
    answer: { service: "WELDING", task: "WELD_GATE_REPAIR", urgency: "SCHEDULED", hazards: [], summary: "Natanggal ang bisagra ng gate at sumasayad.", confidence: "high" },
  },
  {
    text: "may kumakalampag sa may kisame tuwing gabi, di ko alam kung ano",
    answer: { service: "CARPENTRY", task: "CARPENTRY_INSPECT", urgency: "SCHEDULED", hazards: [], summary: "May ingay sa kisame tuwing gabi, hindi alam ang sanhi.", confidence: "low" },
  },
  {
    text: "Amoy gas sa kusina namin simula kaninang umaga",
    answer: { service: "PLUMBING", task: "PLUMBING_INSPECT", urgency: "EMERGENCY", hazards: ["GAS_SMELL"], summary: "Amoy gas sa kusina simula kaninang umaga.", confidence: "low" },
  },
];

export function intakeMessages(text: string, c: Catalog = defaultCatalog): ChatMessage[] {
  const shots = intakeExamples.flatMap<ChatMessage>((e) => [
    { role: "user", content: e.text },
    { role: "assistant", content: JSON.stringify(e.answer) },
  ]);
  return [{ role: "system", content: intakeSystemPrompt(c) }, ...shots, { role: "user", content: text }];
}

// ---------- Job report ----------

export function reportSystemPrompt(service: ServiceCode, c: Catalog = defaultCatalog): string {
  const tasks = tasksForService(service, c)
    .map((t) => `${t.code}: ${t.nameEn}`)
    .join("\n");
  return `You turn a worker's spoken or typed job report (Taglish, Filipino or English) into JSON for an invoice.
Reply with ONE JSON object only. No extra text.

Fields:
- tasksDone: one or more task codes from the list below that the worker says they did
- materials: ONLY materials the worker says they used, as { name, qty, unit }. Never add materials that are not in the text. name is a short ENGLISH name: translate Filipino words (e.g. turnilyo = Screw, pako = Nail, tubo = Pipe, bumbilya = Bulb, pandikit = Glue). qty is a number ("isa"=1, "dalawa"=2, "tatlo"=3, "apat"=4, "lima"=5, "kalahati"=0.5). unit is one of pc, m, ft, kg, L, roll, set, box. Empty list if none.
- durationMinutes: total work time in minutes. If not mentioned, estimate from the work described.
- notes: one short sentence of what was done, in the worker's language
Never include prices.

Tasks:
${tasks}`;
}

// Materials here deliberately don't overlap eval/report.json, so the model can't copy them into answers.
export const reportExamples: { text: string; answer: object }[] = [
  {
    text: "Nagkabit ako ng dalawang bagong LED na bumbilya tsaka pinalitan yung switch, mga 30 minutes",
    answer: { tasksDone: ["ELEC_LIGHT_FIXTURE"], materials: [{ name: "LED bulb", qty: 2, unit: "pc" }, { name: "Light switch", qty: 1, unit: "pc" }], durationMinutes: 30, notes: "Nagkabit ng dalawang LED na bumbilya at pinalitan ang switch." },
  },
  {
    text: "inayos ko yung drawer, gumamit ng apat na turnilyo tsaka isang pares ng drawer slide",
    answer: { tasksDone: ["CARP_CABINET_REPAIR"], materials: [{ name: "Screw", qty: 4, unit: "pc" }, { name: "Drawer slide", qty: 1, unit: "set" }], durationMinutes: 45, notes: "Inayos ang drawer." },
  },
  {
    text: "nilinis ko yung dalawang aircon, wala namang pinalitan, mga dalawang oras",
    answer: { tasksDone: ["AC_CLEANING"], materials: [], durationMinutes: 120, notes: "Nilinis ang dalawang aircon." },
  },
];

export function reportMessages(text: string, service: ServiceCode, c: Catalog = defaultCatalog): ChatMessage[] {
  const shots = reportExamples.flatMap<ChatMessage>((e) => [
    { role: "user", content: e.text },
    { role: "assistant", content: JSON.stringify(e.answer) },
  ]);
  return [{ role: "system", content: reportSystemPrompt(service, c) }, ...shots, { role: "user", content: text }];
}
