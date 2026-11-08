import { describe, expect, it } from "vitest";
import { getAuthSessionId, normalizePhoneNumber } from "./phase4b";

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

  it("rejects a misplaced country-code plus sign", () => {
    expect(normalizePhoneNumber("98+76543210")).toBeNull();
  });
});

describe("auth session identifier", () => {
  it("reads the session claim from a JWT payload", () => {
    const payload = btoa(JSON.stringify({ session_id: "session-a" }));
    expect(getAuthSessionId(`header.${payload}.signature`)).toBe("session-a");
  });

  it("fails closed for a token without a session claim", () => {
    const payload = btoa(JSON.stringify({ sub: "user-a" }));
    expect(getAuthSessionId(`header.${payload}.signature`)).toBeNull();
  });
});