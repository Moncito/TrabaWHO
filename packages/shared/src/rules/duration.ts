import { normalizeText } from "./text";

// Small models are bad at "isang oras at kalahati" -> 90. Code does the arithmetic.
const NUMBERS: Record<string, number> = {
  isa: 1, isang: 1, one: 1,
  dalawa: 2, dalawang: 2, two: 2,
  tatlo: 3, tatlong: 3, three: 3,
  apat: 4, four: 4,
  lima: 5, limang: 5, five: 5,
  anim: 6, six: 6,
  pito: 7, pitong: 7, seven: 7,
  walo: 8, walong: 8, eight: 8,
  siyam: 9, nine: 9,
  sampu: 10, sampung: 10, ten: 10,
  labinlima: 15, labinlimang: 15, fifteen: 15,
  dalawampu: 20, dalawampung: 20, twenty: 20,
  tatlumpu: 30, tatlumpung: 30, thirty: 30,
  kwarentay: 40, forty: 40,
};
const HOUR_UNITS = new Set(["oras", "hour", "hours", "hr", "hrs", "h"]);
const MINUTE_UNITS = new Set(["minuto", "minutos", "minute", "minutes", "min", "mins"]);
const FILLER = new Set(["na", "ng", "mga", "and", "a", "an"]);

function toNumber(word: string): number | null {
  if (/^\d+(\.\d+)?$/.test(word)) return Number(word);
  return NUMBERS[word] ?? null;
}

/** Total minutes mentioned in a worker's report, or null if no duration is stated. */
export function parseDurationMinutes(text: string): number | null {
  // keep decimals ("1.5 hours"): normalizeText would split them
  const words = normalizeText(text.replace(/(\d)\.(\d)/g, "$1DOT$2"))
    .replace(/(\d)dot(\d)/g, "$1.$2")
    .replace(/(\d)(min|mins|hrs?|h)\b/g, "$1 $2")
    .split(" ");

  let total = 0;
  let found = false;
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    // "kalahating oras" / "half an hour" / "half hour"
    if (w === "kalahating" || w === "half") {
      let j = i + 1;
      while (words[j] && FILLER.has(words[j]!)) j++;
      if (words[j] && HOUR_UNITS.has(words[j]!)) {
        total += 30;
        found = true;
        i = j;
        continue;
      }
    }
    const n = toNumber(w);
    if (n === null) continue;
    let j = i + 1;
    while (words[j] && FILLER.has(words[j]!)) j++;
    const unit = words[j];
    if (!unit) continue;
    if (HOUR_UNITS.has(unit)) {
      total += n * 60;
      found = true;
      // "isang oras at kalahati" / "1 hour and a half"
      const rest = words.slice(j + 1, j + 4).join(" ");
      if (/^(at kalahati|and a half|and half)/.test(rest)) total += 30;
      i = j;
    } else if (MINUTE_UNITS.has(unit)) {
      total += n;
      found = true;
      i = j;
    }
  }
  return found && total > 0 ? Math.round(total) : null;
}
