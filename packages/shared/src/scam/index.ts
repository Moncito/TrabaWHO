import { z } from "zod";

import { callWithRetry, type LlmCall } from "../ai/pipeline";
import type { ChatMessage } from "../ai/prompts";
import { containsKeyword, normalizeText } from "../rules/text";

/**
 * Anti-scam check ("Suriin ang mensahe"). The AI only spots WHICH warning signs a message has;
 * code decides the risk level and shows team-written warnings. The message never leaves the phone.
 */
export const SCAM_FLAGS = [
  "OFF_APP_PAYMENT",
  "DEPOSIT_FIRST",
  "CANCEL_BOOKING",
  "ASKS_OTP_OR_PASSWORD",
  "SUSPICIOUS_LINK",
  "URGENT_PRESSURE",
  "PRICE_CHANGE",
] as const;
export const ScamFlag = z.enum(SCAM_FLAGS);
export type ScamFlag = z.infer<typeof ScamFlag>;

export type ScamRisk = "HIGH" | "MEDIUM" | "LOW";

interface FlagInfo {
  severity: "HIGH" | "MEDIUM";
  titleTl: string;
  warningTl: string;
  promptHint: string;
  keywords: string[];
}

export const SCAM_FLAG_INFO: Record<ScamFlag, FlagInfo> = {
  OFF_APP_PAYMENT: {
    severity: "HIGH",
    titleTl: "Bayad sa labas ng app",
    warningTl: "Pinapabayad ka nang direkta (GCash, Maya, bangko) sa labas ng TrabaWho. Sa TrabaWho, cash on completion lang: magbayad lang pagkatapos ng trabaho, nang personal.",
    promptHint: "asks to pay directly by GCash, Maya, bank transfer or another account instead of through the booking",
    keywords: ["gcash", "maya", "paymaya", "bank transfer", "bdo", "bpi", "account number", "diretso na lang sa akin", "sa akin na lang ibayad"],
  },
  DEPOSIT_FIRST: {
    severity: "HIGH",
    titleTl: "Deposit bago dumating",
    warningTl: "Humihingi ng deposit o downpayment bago pa dumating o magsimula. Walang bayad bago matapos ang trabaho sa TrabaWho.",
    promptHint: "asks for a deposit, downpayment, advance, reservation fee or payment before arriving or starting work",
    keywords: ["deposit", "downpayment", "down payment", "advance", "reservation fee", "bayad muna", "magbayad muna", "pambili muna", "pamasahe muna"],
  },
  CANCEL_BOOKING: {
    severity: "HIGH",
    titleTl: "Pinapa-cancel ang booking",
    warningTl: "Pinapa-cancel ang booking o pinapalipat sa usapan sa labas ng app. Kapag nasa labas ka ng TrabaWho, wala kang proteksyon o record.",
    promptHint: "asks to cancel the booking, or to move the deal or chat outside the app",
    keywords: ["cancel mo", "icancel mo", "cancel nyo", "cancel niyo", "kanselahin mo", "wag na sa app", "huwag na sa app", "labas ng app", "di na dumaan sa app", "hindi na dumaan sa app"],
  },
  ASKS_OTP_OR_PASSWORD: {
    severity: "HIGH",
    titleTl: "Humihingi ng OTP o password",
    warningTl: "Humihingi ng OTP, code, PIN o password. Huwag itong ibigay kahit kanino: walang lehitimong worker o client na kailangan nito.",
    promptHint: "asks for an OTP, verification code, PIN or password",
    keywords: ["otp", "verification code", "one time pin", "password", "code na pinadala", "code na natanggap"],
  },
  SUSPICIOUS_LINK: {
    severity: "HIGH",
    titleTl: "Kahina-hinalang link",
    warningTl: "May link na pinapa-click. Huwag mag-login o magbayad sa link na galing sa chat.",
    promptHint: "contains a link or asks to click, open or log in to a website or app",
    keywords: ["http", "www", "bit ly", "bitly", "click mo", "pindutin mo ang link", "link na ito"],
  },
  URGENT_PRESSURE: {
    severity: "MEDIUM",
    titleTl: "Minamadali ka",
    warningTl: "Minamadali ka o tinatakot para magdesisyon agad. Huminto muna at i-check sa app.",
    promptHint: "pressures to act immediately, threatens, or says the offer expires",
    keywords: ["dalian mo", "bilisan mo", "last chance", "ngayon na o hindi", "limited slot"],
  },
  PRICE_CHANGE: {
    severity: "MEDIUM",
    titleTl: "Biglang pagbabago ng presyo",
    warningTl: "Biglang may dagdag na singil sa labas ng napag-usapan. Ipa-itemize sa job report sa app bago magbayad.",
    promptHint: "suddenly raises the price or adds new fees outside what was agreed",
    keywords: ["dagdag bayad", "dagdag singil", "extra bayad", "extra charge", "tataas ang singil", "bagong presyo"],
  },
};

export const SCAM_DISCLAIMER_TL =
  "Babala lang ito mula sa AI sa phone mo at maaaring magkamali. Ang mensahe ay hindi ipinapadala kahit saan.";

export const ScamModelOutput = z.object({ flags: z.array(ScamFlag).default([]) });

export interface ScamWarning {
  flag: ScamFlag;
  title: string;
  text: string;
}

export interface ScamResult {
  risk: ScamRisk;
  flags: ScamFlag[];
  warnings: ScamWarning[];
  source: "model" | "rules";
  latencyMs: number;
}

/** Code-side detection: always runs, so an obvious "GCash" or "OTP" can't be missed by the model. */
export function detectScamFlags(text: string): ScamFlag[] {
  const t = normalizeText(text);
  return SCAM_FLAGS.filter((f) => SCAM_FLAG_INFO[f].keywords.some((kw) => containsKeyword(t, kw)));
}

export function scamRisk(flags: readonly ScamFlag[]): ScamRisk {
  if (flags.some((f) => SCAM_FLAG_INFO[f].severity === "HIGH")) return "HIGH";
  return flags.length ? "MEDIUM" : "LOW";
}

export function buildScamResult(flags: readonly ScamFlag[], source: ScamResult["source"], latencyMs: number): ScamResult {
  const ordered = SCAM_FLAGS.filter((f) => flags.includes(f));
  return {
    risk: scamRisk(ordered),
    flags: ordered,
    warnings: ordered.map((f) => ({ flag: f, title: SCAM_FLAG_INFO[f].titleTl, text: SCAM_FLAG_INFO[f].warningTl })),
    source,
    latencyMs,
  };
}

// ---------- prompt ----------

export const scamJsonSchema = {
  type: "object",
  properties: { flags: { type: "array", items: { type: "string", enum: [...SCAM_FLAGS] } } },
  required: ["flags"],
  additionalProperties: false,
} as const;

export function scamSystemPrompt(): string {
  const list = SCAM_FLAGS.map((f) => `- ${f}: ${SCAM_FLAG_INFO[f].promptHint}`).join("\n");
  return `You check chat messages between a client and a home-repair worker in a Philippine booking app (Taglish, Filipino or English) for scam warning signs.
In this app the client pays cash only AFTER the job is done, in person. Paying online, paying first, or leaving the app are warning signs.
Reply with ONE JSON object only: {"flags": [...]}. Use an empty list if the message is normal.

Flags:
${list}`;
}

/** Few-shot examples. Not copied into any test set used for reported numbers. */
export const scamExamples: { text: string; flags: ScamFlag[] }[] = [
  { text: "Sir pa-send na lang po sa GCash ko yung bayad para di na dumaan sa app", flags: ["OFF_APP_PAYMENT", "CANCEL_BOOKING"] },
  { text: "Kailangan ko po muna ng 500 pambili ng piyesa bago ako pumunta", flags: ["DEPOSIT_FIRST"] },
  { text: "May natanggap po kayong 6-digit code? Pakisabi para ma-confirm ko booking", flags: ["ASKS_OTP_OR_PASSWORD"] },
  { text: "Papunta na po ako, mga 15 minutes andyan na", flags: [] },
  { text: "Ma'am pagkatapos po ng trabaho saka na lang bayaran, cash po", flags: [] },
  { text: "Bilisan mo magdesisyon, may iba pang client na naghihintay, dagdag 1000 na yung singil", flags: ["URGENT_PRESSURE", "PRICE_CHANGE"] },
];

export function scamMessages(text: string): ChatMessage[] {
  const shots = scamExamples.flatMap<ChatMessage>((e) => [
    { role: "user", content: e.text },
    { role: "assistant", content: JSON.stringify({ flags: e.flags }) },
  ]);
  return [{ role: "system", content: scamSystemPrompt() }, ...shots, { role: "user", content: text }];
}

/** Model flags ∪ keyword flags; if the model fails twice, keyword rules alone. */
export async function runScamCheck(text: string, llm: LlmCall): Promise<ScamResult> {
  const started = Date.now();
  const rules = detectScamFlags(text);
  const { value } = await callWithRetry(llm, scamMessages(text), scamJsonSchema, 60, ScamModelOutput);
  const flags = value ? [...new Set([...value.flags, ...rules])] : rules;
  return buildScamResult(flags, value ? "model" : "rules", Date.now() - started);
}
