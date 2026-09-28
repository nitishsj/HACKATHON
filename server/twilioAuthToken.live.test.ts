import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";

const accountSid = process.env.TWILIO_ACCOUNT_SID?.trim() ?? "";
const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
const credentialsPresent = /^AC[0-9a-fA-F]{32}$/.test(accountSid) && authToken.length >= 20;

describe("live Twilio webhook Auth Token", () => {
  it.skipIf(!credentialsPresent)("authenticates a read-only Account API request", async () => {
    const authorization = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      method: "GET",
      headers: { Authorization: `Basic ${authorization}`, Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    // Do not inspect or log the account response; this is an auth check only.
    expect(response.status).toBe(200);
    await response.body?.cancel();
  }, 15_000);
});
