import { describe, expect, it, vi } from "vitest";
import { languageOptions, patientCopy, voiceLocales, type PatientLanguage } from "../shared/patientI18n";
import { approachingSmsBody, getTwilioConfig, isTwilioConfigured, registrationSmsBody, sendTwilioSms, type TwilioConfig } from "./twilioSms";

const config: TwilioConfig = {
  accountSid: `AC${"a".repeat(32)}`,
  apiKeySid: `SK${"b".repeat(32)}`,
  apiKeySecret: "test-secret-value-123",
  fromNumber: "+14155550100",
  authToken: "test-account-auth-token-0123456789",
  statusCallbackUrl: "https://clinic.example/api/twilio/status",
};

const env = {
  TWILIO_ACCOUNT_SID: config.accountSid,
  TWILIO_API_KEY: config.apiKeySid,
  TWILIO_API_SECRET: config.apiKeySecret,
  TWILIO_FROM_NUMBER: config.fromNumber,
  TWILIO_AUTH_TOKEN: config.authToken,
  TWILIO_STATUS_CALLBACK_URL: config.statusCallbackUrl,
};

describe("Twilio queue SMS", () => {
  it("reports not configured unless all server-side credentials and HTTPS callback URL are valid", () => {
    expect(getTwilioConfig({})).toBeNull();
    expect(isTwilioConfigured(env)).toBe(true);
    expect(getTwilioConfig({ ...env, TWILIO_FROM_NUMBER: "4155550100" })).toBeNull();
    expect(getTwilioConfig({ ...env, TWILIO_API_KEY: "not-a-key" })).toBeNull();
    expect(getTwilioConfig({ ...env, TWILIO_AUTH_TOKEN: "short" })).toBeNull();
    expect(getTwilioConfig({ ...env, TWILIO_STATUS_CALLBACK_URL: "http://clinic.example/api/twilio/status" })).toBeNull();
    expect(getTwilioConfig({ ...env, TWILIO_STATUS_CALLBACK_URL: "https://clinic.example/wrong-path" })).toBeNull();
  });

  it("provides English, Hindi, Tamil, and Telugu queue notices without patient names", () => {
    const languages: PatientLanguage[] = ["en", "hi", "ta", "te"];
    expect(languageOptions.map(option => option.code)).toEqual(languages);
    expect(voiceLocales).toMatchObject({ en: "en-IN", hi: "hi-IN", ta: "ta-IN", te: "te-IN" });
    for (const language of languages) {
      const body = approachingSmsBody(language, 8, "CQ-014");
      expect(body).toContain("CQ-014");
      expect(body).not.toContain("Samira");
      expect(patientCopy[language].navPatient.length).toBeGreaterThan(0);
    }
    expect(approachingSmsBody("en", 0, "CQ-014", true)).toContain("Your turn is now");
    expect(approachingSmsBody("hi", 0, "CQ-014", true)).toContain("STOP");
  });

  it("sends a localized registration confirmation with token, ETA and opt-out wording", () => {
    for (const language of ["en", "hi", "ta", "te"] as const) {
      const body = registrationSmsBody(language, "CQ-014", 18);
      expect(body).toContain("CQ-014");
      expect(body).toContain("18");
      expect(body).toContain("STOP");
      expect(body).not.toContain("Samira");
    }
    expect(registrationSmsBody("en", "CQ-014", -2)).toContain("~0 min");
  });

  it("does not make a network call when credentials are absent or the recipient is invalid", async () => {
    const fetcher = vi.fn();
    await expect(sendTwilioSms("+14155550101", "test", null, fetcher as typeof fetch)).resolves.toEqual({ ok: false, errorCode: "NOT_CONFIGURED" });
    await expect(sendTwilioSms("4155550101", "test", config, fetcher as typeof fetch)).resolves.toEqual({ ok: false, errorCode: "INVALID_TO" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("posts form-encoded SMS through Twilio with API-key Basic auth and the per-message callback URL", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ sid: `SM${"c".repeat(32)}`, status: "queued" }), { status: 201 }));
    const result = await sendTwilioSms("+919876543210", "Queue token CQ-014", config, fetcher as typeof fetch);
    expect(result).toEqual({ ok: true, sid: `SM${"c".repeat(32)}`, status: "queued" });
    const [url, request] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`);
    expect(request.method).toBe("POST");
    expect(request.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from(`${config.apiKeySid}:${config.apiKeySecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    });
    expect(new URLSearchParams(String(request.body))).toEqual(new URLSearchParams({
      To: "+919876543210",
      From: config.fromNumber,
      Body: "Queue token CQ-014",
      StatusCallback: config.statusCallbackUrl,
    }));
  });

  it("returns only Twilio error codes, not raw provider messages", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: 21211, message: "Sensitive provider detail" }), { status: 400 }));
    await expect(sendTwilioSms("+919876543210", "test", config, fetcher as typeof fetch)).resolves.toEqual({ ok: false, errorCode: "21211" });
  });

  it("converts network exceptions into a safe retryable error", async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error("private network detail"));
    await expect(sendTwilioSms("+919876543210", "test", config, fetcher as typeof fetch)).resolves.toEqual({ ok: false, errorCode: "NETWORK_ERROR" });
  });
});
