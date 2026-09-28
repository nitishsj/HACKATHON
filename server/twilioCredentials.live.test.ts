import { describe, expect, it } from "vitest";
import { Buffer } from "node:buffer";
import { getTwilioConfig } from "./twilioSms";

const config = getTwilioConfig();

describe("live Twilio credentials", () => {
  it.skipIf(!config)("authenticate a read-only Messages API request", async () => {
    if (!config) throw new Error("Twilio server secrets are missing or malformed.");

    const authorization = Buffer.from(`${config.apiKeySid}:${config.apiKeySecret}`).toString("base64");
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json?PageSize=1`,
      {
        method: "GET",
        headers: { Authorization: `Basic ${authorization}`, Accept: "application/json" },
        signal: AbortSignal.timeout(12_000),
      },
    );
    // Deliberately inspect only the status: the account response may contain recipient metadata.
    expect(response.status).toBe(200);
    await response.body?.cancel();
  }, 15_000);
});
