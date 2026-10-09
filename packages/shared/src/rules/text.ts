/** Lowercase, strip accents, drop hyphens ("nag-spark" -> "nagspark"), collapse spaces. */
export function normalizeText(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/-/g, "")
    .replace(/[^a-z0-9ñ\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Short keywords (< 5 chars, e.g. "ac", "tulo") must match a whole word so "ac" doesn't
 * hit "taco". Longer keywords can match inside words ("nagspark" in "nagsparks").
 */
export function containsKeyword(normalizedText: string, keyword: string): boolean {
  const kw = normalizeText(keyword);
  if (!kw) return false;
  if (kw.length >= 5) return normalizedText.includes(kw);
  return ` ${normalizedText} `.includes(` ${kw} `);
}

export function countKeywords(normalizedText: string, keywords: readonly string[]): number {
  return keywords.reduce((n, kw) => n + (containsKeyword(normalizedText, kw) ? 1 : 0), 0);
}
