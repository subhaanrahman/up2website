import { describe, it, expect } from "vitest";
import { toE164 } from "./phone";

describe("toE164", () => {
  it("formats digits to E.164", () => {
    expect(toE164("0412345678")).toBe("+0412345678");
    expect(toE164("61412345678")).toBe("+61412345678");
  });

  it("strips non-digits", () => {
    expect(toE164("(04) 1234-5678")).toBe("+0412345678");
    expect(toE164("+61 412 345 678")).toBe("+61412345678");
    expect(toE164("04-12-34-56-78")).toBe("+0412345678");
  });

  it("returns original string when empty after strip", () => {
    expect(toE164("")).toBe("");
    expect(toE164("   ")).toBe("   ");
    expect(toE164("- ()")).toBe("- ()");
  });

  it("handles international prefixes", () => {
    expect(toE164("+61")).toBe("+61");
    expect(toE164("61 412 345 678")).toBe("+61412345678");
  });
});
