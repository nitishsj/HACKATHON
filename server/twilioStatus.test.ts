import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { canAdvanceSmsDeliveryStatus, parseSmsDeliveryStatus, validateTwilioSignature } from "./twilioStatus";

const authToken = "0123456789abcdef0123456789abcdef";
const url = "https://clinic.example/api/twilio/status";
const params = { ErrorCode: "", MessageSid: "SM0123456789abcdef0123456789abcdef", MessageStatus: "delivered" };
function signatureFor(values: Record<string, string>) {
  const canonical = url + Object.keys(values).sort().map(key => key + values[key]).join("");
  return createHmac("sha1", authToken).update(canonical).digest("base64");
}

describe("Twilio delivery callbacks", () => {
  it("recognizes delivery states while ignoring unknown provider states", () => {
    expect(parseSmsDeliveryStatus(" Delivered ")).toBe("delivered");
    expect(parseSmsDeliveryStatus("undelivered")).toBe("undelivered");
    expect(parseSmsDeliveryStatus("future_provider_state")).toBeNull();
    expect(parseSmsDeliveryStatus(undefined)).toBeNull();
  });

  it("does not regress delivery status when callback requests arrive out of order", () => {
    expect(canAdvanceSmsDeliveryStatus("queued", "sent")).toBe(true);
    expect(canAdvanceSmsDeliveryStatus("sent", "delivered")).toBe(true);
    expect(canAdvanceSmsDeliveryStatus("delivered", "sent")).toBe(false);
    expect(canAdvanceSmsDeliveryStatus("read", "delivered")).toBe(false);
  });

  it("validates all form parameters using the Twilio SDK and exact configured URL", () => {
    const signature = signatureFor(params);
    expect(validateTwilioSignature(authToken, signature, url, params)).toBe(true);
    expect(validateTwilioSignature(authToken, signature, `${url}/`, params)).toBe(false);
    expect(validateTwilioSignature(authToken, signature, url, { ...params, MessageStatus: "sent" })).toBe(false);
  });
});
