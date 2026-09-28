import { Buffer } from "node:buffer";
import type { PatientLanguage } from "../shared/patientI18n";

export type TwilioWebhookConfig = {
  authToken: string;
  statusCallbackUrl: string;
};

export type TwilioConfig = TwilioWebhookConfig & {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  fromNumber: string;
};

export type TwilioSendResult =
  | { ok: true; sid: string; status: string }
  | { ok: false; errorCode: string };

export const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

export function getTwilioStatusCallbackUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const raw = env.TWILIO_STATUS_CALLBACK_URL?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const normalizedPath = url.pathname.replace(/\/$/, "");
    if (url.protocol !== "https:" || url.username || url.password || normalizedPath !== "/api/twilio/status" || url.search || url.hash) return null;
    url.pathname = normalizedPath;
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getTwilioWebhookConfig(env: NodeJS.ProcessEnv = process.env): TwilioWebhookConfig | null {
  const authToken = env.TWILIO_AUTH_TOKEN?.trim() ?? "";
  const statusCallbackUrl = getTwilioStatusCallbackUrl(env);
  if (authToken.length < 20 || !statusCallbackUrl) return null;
  return { authToken, statusCallbackUrl };
}

export function getTwilioConfig(env: NodeJS.ProcessEnv = process.env): TwilioConfig | null {
  const accountSid = env.TWILIO_ACCOUNT_SID?.trim() ?? "";
  const apiKeySid = env.TWILIO_API_KEY?.trim() ?? "";
  const apiKeySecret = env.TWILIO_API_SECRET?.trim() ?? "";
  const fromNumber = env.TWILIO_FROM_NUMBER?.trim() ?? "";
  const webhook = getTwilioWebhookConfig(env);
  if (!/^AC[0-9a-fA-F]{32}$/.test(accountSid)) return null;
  if (!/^SK[0-9a-fA-F]{32}$/.test(apiKeySid) || apiKeySecret.length < 8) return null;
  if (!E164_PHONE_PATTERN.test(fromNumber) || !webhook) return null;
  return { accountSid, apiKeySid, apiKeySecret, fromNumber, ...webhook };
}

export function isTwilioConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return getTwilioConfig(env) !== null;
}

export function approachingSmsBody(language: PatientLanguage, etaMinutes: number, token: string, turnIsCalled = false): string {
  const minutes = Math.max(0, Math.ceil(etaMinutes));
  const copy: Record<PatientLanguage, { approaching: (eta: number, ticket: string) => string; called: (ticket: string) => string }> = {
    en: {
      approaching: (eta, ticket) => `CareQueue: Your turn is in about ${eta} min. Stay near reception. Token ${ticket}. Reply STOP to opt out.`,
      called: ticket => `CareQueue: Your turn is now. Please go to reception. Token ${ticket}. Reply STOP to opt out.`,
    },
    hi: {
      approaching: (eta, ticket) => `CareQueue: आपकी बारी लगभग ${eta} मिनट में है। स्वागत कक्ष के पास रहें। टोकन ${ticket}। बंद करने को STOP भेजें।`,
      called: ticket => `CareQueue: आपकी बारी है। स्वागत कक्ष आएँ। टोकन ${ticket}। बंद करने को STOP भेजें।`,
    },
    ta: {
      approaching: (eta, ticket) => `CareQueue: உங்கள் முறை சுமார் ${eta} நிமிடங்களில். வரவேற்பறை அருகில் இருங்கள். டோக்கன் ${ticket}. நிறுத்த STOP அனுப்பவும்.`,
      called: ticket => `CareQueue: உங்கள் முறை இப்போது. வரவேற்பறைக்கு வாருங்கள். டோக்கன் ${ticket}. நிறுத்த STOP அனுப்பவும்.`,
    },
    te: {
      approaching: (eta, ticket) => `CareQueue: మీ వంతు సుమారు ${eta} నిమిషాల్లో. రిసెప్షన్ దగ్గర ఉండండి. టోకెన్ ${ticket}. ఆపేందుకు STOP పంపండి.`,
      called: ticket => `CareQueue: మీ వంతు ఇప్పుడు. రిసెప్షన్‌కు రండి. టోకెన్ ${ticket}. ఆపేందుకు STOP పంపండి.`,
    },
  };
  return turnIsCalled ? copy[language].called(token) : copy[language].approaching(minutes, token);
}

export function registrationSmsBody(language: PatientLanguage, token: string, etaMinutes: number): string {
  const minutes = Math.max(0, Math.ceil(etaMinutes));
  const messages: Record<PatientLanguage, (ticket: string, eta: number) => string> = {
    en: (ticket, eta) => `CareQueue: Check-in confirmed. Token ${ticket}; estimated wait ~${eta} min. We’ll text near your turn. Reply STOP to opt out.`,
    hi: (ticket, eta) => `CareQueue: पंजीकरण पूरा। टोकन ${ticket}; प्रतीक्षा लगभग ${eta} मिनट। बारी पास आने पर संदेश मिलेगा। बंद करने को STOP भेजें।`,
    ta: (ticket, eta) => `CareQueue: பதிவு உறுதி. டோக்கன் ${ticket}; காத்திருப்பு சுமார் ${eta} நிமிடம். முறை நெருங்கும்போது செய்தி வரும். நிறுத்த STOP அனுப்பவும்.`,
    te: (ticket, eta) => `CareQueue: నమోదు పూర్తయింది. టోకెన్ ${ticket}; వేచి సమయం సుమారు ${eta} నిమిషాలు. మీ వంతు దగ్గరలో SMS వస్తుంది. ఆపేందుకు STOP పంపండి.`,
  };
  return messages[language](token, minutes);
}

export async function sendTwilioSms(
  to: string,
  body: string,
  config: TwilioConfig | null = getTwilioConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<TwilioSendResult> {
  if (!config) return { ok: false, errorCode: "NOT_CONFIGURED" };
  if (!E164_PHONE_PATTERN.test(to)) return { ok: false, errorCode: "INVALID_TO" };

  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
  const authorization = Buffer.from(`${config.apiKeySid}:${config.apiKeySecret}`).toString("base64");
  const form = new URLSearchParams({ To: to, From: config.fromNumber, Body: body, StatusCallback: config.statusCallbackUrl });
  try {
    const response = await fetchImpl(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${authorization}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
      signal: AbortSignal.timeout(8000),
    });
    const payload = await response.json().catch(() => ({})) as { sid?: unknown; status?: unknown; code?: unknown };
    if (!response.ok) {
      const code = typeof payload.code === "number" || typeof payload.code === "string" ? String(payload.code) : `HTTP_${response.status}`;
      return { ok: false, errorCode: code.slice(0, 16) };
    }
    if (typeof payload.sid !== "string" || !payload.sid.startsWith("SM")) {
      return { ok: false, errorCode: "INVALID_RESPONSE" };
    }
    return { ok: true, sid: payload.sid, status: typeof payload.status === "string" ? payload.status : "accepted" };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    return { ok: false, errorCode: name === "TimeoutError" || name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR" };
  }
}
