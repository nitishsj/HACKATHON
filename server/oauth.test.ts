import { describe, expect, it } from "vitest";
import { encodeOAuthState, OAUTH_STATE_TTL_SECONDS } from "../shared/const";
import { getSafeOAuthReturnPath } from "./_core/oauth";

describe("OAuth app return path", () => {
  it("returns to the staff route requested before same-tab provider sign-in", () => {
    const state = encodeOAuthState({
      redirectUri: "https://clinic.example/api/oauth/callback",
      nonce: "one-time-test-nonce",
      returnPath: "/staff",
    });
    expect(getSafeOAuthReturnPath(state)).toBe("/staff");
  });

  it("preserves a safe local query while rejecting protocol-relative and external redirects", () => {
    const local = encodeOAuthState({ redirectUri: "", returnPath: "/staff?panel=analytics" });
    const external = encodeOAuthState({ redirectUri: "", returnPath: "https://evil.example/" });
    const protocolRelative = encodeOAuthState({ redirectUri: "", returnPath: "//evil.example/" });
    expect(getSafeOAuthReturnPath(local)).toBe("/staff?panel=analytics");
    expect(getSafeOAuthReturnPath(external)).toBe("/staff");
    expect(getSafeOAuthReturnPath(protocolRelative)).toBe("/staff");
  });

  it("falls back safely for missing or legacy state without a return path", () => {
    expect(getSafeOAuthReturnPath()).toBe("/staff");
    expect(getSafeOAuthReturnPath(btoa("https://clinic.example/api/oauth/callback"))).toBe("/staff");
  });

  it("keeps the one-time in-app login nonce alive for a 30-minute provider flow", () => {
    expect(OAUTH_STATE_TTL_SECONDS).toBe(30 * 60);
  });
});
