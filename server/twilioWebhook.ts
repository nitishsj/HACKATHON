import type { Express, Request, Response } from "express";
import { and, eq } from "drizzle-orm";
import { queueTickets } from "../drizzle/schema";
import { getDb } from "./db";
import { getTwilioWebhookConfig } from "./twilioSms";
import { canAdvanceSmsDeliveryStatus, parseSmsDeliveryStatus, validateTwilioSignature } from "./twilioStatus";

function formParameters(request: Request): Record<string, unknown> {
  return request.body && typeof request.body === "object" ? request.body as Record<string, unknown> : {};
}

function valueAsText(value: unknown): string | null {
  if (typeof value === "string" || typeof value === "number") return String(value);
  return null;
}

export function registerTwilioStatusRoute(app: Express) {
  app.post("/api/twilio/status", async (request: Request, response: Response) => {
    const config = getTwilioWebhookConfig();
    if (!config) return response.sendStatus(503);

    const signature = request.get("X-Twilio-Signature");
    const params = formParameters(request);
    if (!signature || !validateTwilioSignature(config.authToken, signature, config.statusCallbackUrl, params)) {
      return response.sendStatus(403);
    }

    const sid = valueAsText(params.MessageSid ?? params.SmsSid);
    const status = parseSmsDeliveryStatus(params.MessageStatus ?? params.SmsStatus);
    if (!sid || !/^SM[0-9a-fA-F]{32}$/.test(sid)) return response.sendStatus(200);
    if (!status) return response.sendStatus(200);

    const db = await getDb();
    if (!db) return response.sendStatus(503);
    const rawErrorCode = valueAsText(params.ErrorCode);
    const errorCode = rawErrorCode && /^\d{1,16}$/.test(rawErrorCode) ? rawErrorCode : null;

    await db.transaction(async tx => {
      const [ticket] = await tx.select({ id: queueTickets.id, status: queueTickets.smsDeliveryStatus })
        .from(queueTickets)
        .where(and(eq(queueTickets.twilioMessageSid, sid), eq(queueTickets.isDemo, 0)))
        .limit(1)
        .for("update");
      if (!ticket || !canAdvanceSmsDeliveryStatus(ticket.status, status)) return;

      await tx.update(queueTickets).set({
        smsDeliveryStatus: status,
        smsStatusUpdatedAt: new Date(),
        smsLastErrorCode: status === "delivered" || status === "read" ? null : errorCode,
      }).where(eq(queueTickets.id, ticket.id));
    });

    // Twilio only needs an acknowledgement; never return patient or account data.
    return response.sendStatus(200);
  });
}
