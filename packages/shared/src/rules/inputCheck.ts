import { catalog as defaultCatalog, type Catalog } from "../catalog";
import { detectHazards, keywordIntake } from "./fallback";
import { normalizeText } from "./text";

/** Longest text sent to the on-device model (keeps it fast; the UI caps typing at this too). */
export const MAX_INPUT_CHARS = 500;

export type InputProblem = "too_short" | "too_long" | "gibberish";
export type InputCheck = { ok: true } | { ok: false; problem: InputProblem; message: string };

const MESSAGES: Record<InputProblem, string> = {
  too_short: "Add a few more words about what is broken. Ilarawan pa nang kaunti ang sira.",
  too_long: `Keep it under ${MAX_INPUT_CHARS} characters. Paikliin nang kaunti.`,
  gibberish: "We couldn't read that. Describe what is broken, e.g. \"tumutulo ang gripo sa kusina\". Hindi namin maintindihan.",
};

// Runs of 3 neighbouring keys ("asd", "qwe"): keyboard mashing. Kept to runs that real
// Tagalog/English repair words don't contain ("wer"/"ert"/"rty" are left out: power, alert, party).
const KEY_RUNS = ["qwe", "asd", "sdf", "dfg", "fgh", "ghj", "hjk", "jkl", "zxc", "xcv", "cvb", "vbn", "bnm", "yui", "uio", "iop", "tyu", "lkj", "kjh", "jhg", "hgf", "gfd", "fds", "dsa", "ewq", "mnb", "nbv", "bvc", "vcx", "cxz", "poi", "oiu", "iuy"];

/** One word that can't be Tagalog or English: no vowel, long consonant run, "aaa", key mashing, or "abcabcabc". */
function isGibberishWord(w: string): boolean {
  if (w.length < 4) return false; // too short to judge ("cr", "lpg", "tv", "ng")
  if (!/[aeiou]/.test(w)) return true;
  if (/(.)\1\1/.test(w)) return true;
  if (/[^aeiou\d]{5,}/.test(w)) return true;
  if (KEY_RUNS.some((k) => w.includes(k))) return true;
  // A 2-4 letter chunk repeated 3+ times ("asdasdasd", "hahaha"); "sirasira" (x2) is real Tagalog.
  return /^(.{2,4})\1\1/.test(w);
}

/** True when the text names a service, task or hazard from the catalog. */
export function hasRepairSignal(text: string, c: Catalog = defaultCatalog): boolean {
  return keywordIntake(text, c) !== null;
}

/**
 * Plain-code check before the AI runs. Lenient on purpose: it only stops text that can't be a
 * description at all (empty-ish, too long, keyboard mashing). Anything naming a hazard or a
 * catalog keyword always passes, so "gas!!" is never blocked.
 */
export function checkProblemText(text: string, c: Catalog = defaultCatalog): InputCheck {
  const fail = (problem: InputProblem): InputCheck => ({ ok: false, problem, message: MESSAGES[problem] });
  const trimmed = text.trim();
  if (trimmed.length > MAX_INPUT_CHARS) return fail("too_long");
  if (detectHazards(trimmed, c).length || hasRepairSignal(trimmed, c)) return { ok: true };

  const words = normalizeText(trimmed)
    .split(" ")
    .map((w) => w.replace(/\d/g, ""))
    .filter(Boolean);
  const letters = words.join("").length;
  const judged = words.filter((w) => w.length >= 4);
  const gibberish = judged.filter(isGibberishWord).length;
  if (judged.length && gibberish / judged.length >= 0.5) return fail("gibberish");
  if (letters < 6 || judged.length === 0) return fail("too_short");
  return { ok: true };
}

/** Worker report box: same structure check, no catalog keywords needed (materials vary). */
export function checkReportText(text: string): InputCheck {
  const trimmed = text.trim();
  if (trimmed.length > MAX_INPUT_CHARS) return { ok: false, problem: "too_long", message: MESSAGES.too_long };
  const words = normalizeText(trimmed)
    .split(" ")
    .map((w) => w.replace(/\d/g, ""))
    .filter(Boolean);
  const judged = words.filter((w) => w.length >= 4);
  if (judged.length && judged.filter(isGibberishWord).length / judged.length >= 0.5) {
    return { ok: false, problem: "gibberish", message: "We couldn't read that. Write what you did, e.g. \"pinalitan ko yung gripo, 30 minutes\". Hindi namin maintindihan." };
  }
  if (words.join("").length < 6) return { ok: false, problem: "too_short", message: "Add a few more words about the work you did. Dagdagan pa nang kaunti." };
  return { ok: true };
}
