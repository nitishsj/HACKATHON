import { randomBytes, createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";

const authToken = process.env.TWILIO_AUTH_TOKEN?.trim() ?? "";
const callbackUrl = process.env.TWILIO_STATUS_CALLBACK_URL?.trim() ?? "";
const canReach = authToken.length >= 20 && Boolean(callbackUrl);

function signatureFor(values: Record<string, string>) {
  const canonical = callbackUrl + Object.keys(values).sort().map(key => key + values[key]).join("");
  return createHmac("sha1", authToken).update(canonical).digest("base64");
}

async function post(values: Record<string, string>, signature: string) {
  return fetch(callbackUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Twilio-Signature": signature,
    },
    body: new URLSearchParams(values),
    signal: AbortSignal.timeout(15_000),
  });
}

describe("live Twilio callback endpoint", () => {
  it.skipIf(!canReach)("rejects a bad signature at the configured public callback URL", async () => {
    const response = await post(
      { MessageSid: "invalid", MessageStatus: "delivered" },
      "invalid-signature",
    );
    expect(response.status).toBe(403);
  }, 20_000);

  it.skipIf(!canReach)("accepts a signed synthetic callback for a random unknown SID without sending SMS", async () => {
    const values = {
      MessageSid: `SM${randomBytes(16).toString("hex")}`,
      MessageStatus: "delivered",
    };
    const response = await post(values, signatureFor(values));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  }, 20_000);
});
