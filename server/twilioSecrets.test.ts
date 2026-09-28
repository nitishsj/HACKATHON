import { describe, expect, it } from "vitest";
import { getTwilioStatusCallbackUrl, isTwilioConfigured } from "./twilioSms";

const requiredKeys = ["TWILIO_ACCOUNT_SID", "TWILIO_API_KEY", "TWILIO_API_SECRET", "TWILIO_FROM_NUMBER", "TWILIO_AUTH_TOKEN", "TWILIO_STATUS_CALLBACK_URL"] as const;
const hasAnyCredential = requiredKeys.some(key => Boolean(process.env[key]?.trim()));

describe("secure Twilio project secrets", () => {
  it.skipIf(!hasAnyCredential)("are complete and have the expected Twilio SID/phone formats", () => {
    expect(requiredKeys.every(key => Boolean(process.env[key]?.trim()))).toBe(true);
    expect(isTwilioConfigured()).toBe(true);
    expect(getTwilioStatusCallbackUrl()).toMatch(/^https:\/\/.+\/api\/twilio\/status$/);
  });
});
