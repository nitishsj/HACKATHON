import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { createHmac } from "node:crypto";
import express from "express";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { registerTwilioStatusRoute } from "./twilioWebhook";

const authToken = "test-twilio-auth-token-0123456789";
const callbackUrl = "https://clinic.example/api/twilio/status";
const params = { MessageSid: "not-a-real-message", MessageStatus: "delivered" };
function sign(values: Record<string, string>) {
  const canonical = callbackUrl + Object.keys(values).sort().map(key => key + values[key]).join("");
  return createHmac("sha1", authToken).update(canonical).digest("base64");
}

describe("Twilio status webhook route", () => {
  const app = express();
  app.use(express.urlencoded({ extended: false }));
  registerTwilioStatusRoute(app);
  let server: ReturnType<typeof app.listen> | undefined;
  let baseUrl = "";

  beforeAll(async () => {
    vi.stubEnv("TWILIO_AUTH_TOKEN", authToken);
    vi.stubEnv("TWILIO_STATUS_CALLBACK_URL", callbackUrl);
    server = app.listen(0, "127.0.0.1");
    await once(server, "listening");
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    if (server) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
  });

  it("rejects invalid signatures before touching message records", async () => {
    const response = await fetch(`${baseUrl}/api/twilio/status`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": "invalid" },
      body: new URLSearchParams(params),
    });
    expect(response.status).toBe(403);
  });

  it("acknowledges a validly signed callback for an unknown SID without disclosing data", async () => {
    const response = await fetch(`${baseUrl}/api/twilio/status`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "X-Twilio-Signature": sign(params) },
      body: new URLSearchParams(params),
    });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("OK");
  });
});
