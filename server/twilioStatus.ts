import twilio from "twilio";
import type { SmsDeliveryStatus } from "../shared/queueLogic";

const statusRanks: Record<SmsDeliveryStatus, number> = {
  none: 0,
  accepted: 1,
  scheduled: 1,
  queued: 2,
  sending: 3,
  sent: 4,
  canceled: 5,
  failed: 5,
  undelivered: 5,
  delivered: 6,
  read: 7,
};

const knownStatuses = new Set(Object.keys(statusRanks));

export function parseSmsDeliveryStatus(value: unknown): SmsDeliveryStatus | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return knownStatuses.has(normalized) ? normalized as SmsDeliveryStatus : null;
}

/** Ignore out-of-order callbacks that would move a patient's delivery badge backwards. */
export function canAdvanceSmsDeliveryStatus(current: string, next: SmsDeliveryStatus): boolean {
  const currentRank = statusRanks[current as SmsDeliveryStatus] ?? 0;
  return statusRanks[next] >= currentRank;
}

/** Delegate signature validation to Twilio's official SDK; do not implement the HMAC algorithm in production code. */
export function validateTwilioSignature(
  authToken: string,
  signature: string,
  exactCallbackUrl: string,
  allFormParameters: Record<string, unknown>,
): boolean {
  try {
    return twilio.validateRequest(authToken, signature, exactCallbackUrl, allFormParameters);
  } catch {
    return false;
  }
}
