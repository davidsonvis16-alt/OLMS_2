import { describe, expect, it } from "vitest";
import { checkPassword, generatePassword } from "@/lib/password";

describe("password rules", () => {
  it.each([
    ["password", "too short, no mix"],
    ["password1234", "no capitals or symbols"],
    ["Password1234", "no symbol"],
    ["PASSWORD123!", "no lowercase"],
    ["Passsword12!", "three in a row"],
    ["Davidson.123!", "contains the person's name"],
  ])("rejects %s (%s)", (pw) => {
    expect(checkPassword(pw, { email: "davidson.vis.16@gmail.com", name: "Davidson Reyes" }).valid).toBe(false);
  });
  it("accepts a properly mixed password", () => {
    expect(checkPassword("LMS.phase1.setup!").valid).toBe(true);
    expect(checkPassword("Tq7#mVw2!kZp9x").valid).toBe(true);
  });
});

describe("password generator", () => {
  it("always produces passwords that pass every rule", () => {
    for (let i = 0; i < 2000; i++) expect(checkPassword(generatePassword()).valid).toBe(true);
  });
  it("never repeats across 20,000 generations", () => {
    const seen = new Set(Array.from({ length: 20000 }, () => generatePassword()));
    expect(seen.size).toBe(20000);
  });
  it("uses the whole character range (no fixed pattern)", () => {
    const counts = new Map<string, number>();
    for (let i = 0; i < 3000; i++) for (const ch of generatePassword()) counts.set(ch, (counts.get(ch) ?? 0) + 1);
    expect(counts.size).toBe(24 + 25 + 8 + 13); // every allowed character turned up
    const first = new Set(Array.from({ length: 500 }, () => generatePassword()[0]));
    expect(first.size).toBeGreaterThan(40); // the first character isn't predictable
  });
  it("leaves out look-alike characters", () => {
    for (let i = 0; i < 500; i++) expect(generatePassword()).not.toMatch(/[0O1lI]/);
  });
});
