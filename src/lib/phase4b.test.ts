import { describe, expect, it } from "vitest";
import { matchesActiveSession, normalizePhoneNumber } from "./phase4b";

describe("phone authentication input", () => {
  it("normalizes a 10-digit Indian mobile number", () => {
    expect(normalizePhoneNumber("98765 43210")).toBe("+919876543210");
  });

  it("keeps a valid international phone number in E.164 form", () => {
    expect(normalizePhoneNumber("+1 (415) 555-2671")).toBe("+14155552671");
  });

  it("rejects a phone number outside the supported E.164 length", () => {
    expect(normalizePhoneNumber("12345")).toBeNull();
  });
});

describe("active device session matching", () => {
  it("accepts only the currently pinned auth session", () => {
    expect(matchesActiveSession("session-a", "session-a")).toBe(true);
    expect(matchesActiveSession("session-a", "session-b")).toBe(false);
  });

  it("fails closed when either session identifier is missing", () => {
    expect(matchesActiveSession("session-a", null)).toBe(false);
    expect(matchesActiveSession(null, "session-a")).toBe(false);
  });
});