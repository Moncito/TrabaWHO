import { describe, expect, it } from "vitest";
import { parseDurationMinutes } from "../src";

describe("parseDurationMinutes", () => {
  it.each([
    ["45 minutes", 45],
    ["mga 40 mins", 40],
    ["1 hour", 60],
    ["1.5 hours", 90],
    ["isang oras", 60],
    ["dalawang oras lahat", 120],
    ["isang oras at kalahati", 90],
    ["kalahating oras lang", 30],
    ["half an hour", 30],
    ["isang oras at 15 minutes", 75],
    ["tapos sa 2hrs", 120],
  ])("%s -> %i", (text, minutes) => {
    expect(parseDurationMinutes(text)).toBe(minutes);
  });

  it("ignores numbers that aren't durations", () => {
    expect(parseDurationMinutes("dalawang metro ng wire, 20 amps")).toBeNull();
    expect(parseDurationMinutes("gumamit ng 2 m wire, 45 minutes")).toBe(45);
  });
});

