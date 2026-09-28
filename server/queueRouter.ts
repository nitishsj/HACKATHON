import { and, asc, desc, eq, gte, inArray, isNotNull, isNull, lt, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { queueEvents, queueTickets } from "../drizzle/schema";
import { buildConsultationTrend, buildHourlyFlow, estimateWaitMinutes, formatToken, isQueueSmsDue, normalizePatientPhone, type QueuePosition } from "../shared/queueLogic";
import { createDemoTickets } from "../shared/demoData";
import { getDb } from "./db";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { approachingSmsBody, E164_PHONE_PATTERN, getTwilioConfig, registrationSmsBody, sendTwilioSms } from "./twilioSms";

const activeStatuses = ["waiting", "called", "in_consultation"] as const;
const activeStatusFilter = inArray(queueTickets.status, [...activeStatuses]);
const patientKeyInput = z.object({ id: z.number().int().positive(), accessKey: z.string().uuid() });
const patientLanguageInput = z.enum(["en", "hi", "ta", "te"]);
const smsClaimTtlMs = 5 * 60_000;

function requireDatabase(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Queue database is unavailable. Please try again." });
  }
  return db;
}

function startOfUtcDay() {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

async function averageConsultMinutes(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  const recent = await db
    .select({ consultationStartedAt: queueTickets.consultationStartedAt, completedAt: queueTickets.completedAt })
    .from(queueTickets)
    .where(and(eq(queueTickets.status, "completed"), isNotNull(queueTickets.consultationStartedAt), isNotNull(queueTickets.completedAt)))
    .orderBy(desc(queueTickets.completedAt))
    .limit(30);

  const durations = recent
    .filter(row => row.consultationStartedAt && row.completedAt)
    .map(row => (row.completedAt!.getTime() - row.consultationStartedAt!.getTime()) / 60_000)
    .filter(minutes => Number.isFinite(minutes) && minutes >= 1 && minutes <= 90);

  if (!durations.length) return 7;
  return Math.min(30, Math.max(3, Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)));
}

async function listActive(db: NonNullable<Awaited<ReturnType<typeof getDb>>>) {
  return db
    .select()
    .from(queueTickets)
    .where(activeStatusFilter)
    .orderBy(asc(queueTickets.queuedAt), asc(queueTickets.id));
}

function toPosition(row: typeof queueTickets.$inferSelect): QueuePosition {
  return {
    id: row.id,
    status: row.status,
    queuedAt: row.queuedAt,
    consultationStartedAt: row.consultationStartedAt,
  };
}

/**
 * Dispatch one consented, localized alert when a patient's live ETA first enters
 * the 10-minute window. A short DB claim prevents concurrent queue actions from
 * sending duplicates; stale claims can be retried after a process interruption.
 */
async function notifyApproachingPatients(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, excludedTicketId?: number) {
  const config = getTwilioConfig();
  if (!config) return;

  const [rows, average] = await Promise.all([listActive(db), averageConsultMinutes(db)]);
  const lineup = rows.map(toPosition);
  const now = new Date();
  const staleClaimBefore = new Date(now.getTime() - smsClaimTtlMs);

  for (const row of rows) {
    if (row.id === excludedTicketId) continue;
    if ((row.status !== "waiting" && row.status !== "called") || row.smsOptIn !== 1 || !row.patientPhone || row.smsApproachingSentAt) continue;
    const turnIsCalled = row.status === "called";
    const etaMinutes = turnIsCalled ? 0 : estimateWaitMinutes(row.id, lineup, average, now);
    if (!isQueueSmsDue(row.status, etaMinutes)) continue;

    const [claimResult] = await db
      .update(queueTickets)
      .set({ approachingSmsClaimedAt: now, smsLastErrorCode: null })
      .where(and(
        eq(queueTickets.id, row.id),
        eq(queueTickets.status, "waiting"),
        eq(queueTickets.smsOptIn, 1),
        isNotNull(queueTickets.patientPhone),
        isNull(queueTickets.smsApproachingSentAt),
        or(isNull(queueTickets.approachingSmsClaimedAt), lt(queueTickets.approachingSmsClaimedAt, staleClaimBefore)),
      ));
    if (claimResult.affectedRows !== 1) continue;

    const result = await sendTwilioSms(
      row.patientPhone,
      approachingSmsBody(row.preferredLanguage, etaMinutes, formatToken(row.id), turnIsCalled),
      config,
    );
    if (result.ok) {
      await db.update(queueTickets).set({
        smsApproachingSentAt: new Date(),
        approachingSmsClaimedAt: null,
        twilioMessageSid: result.sid,
        smsDeliveryStatus: result.status.slice(0, 24),
        smsStatusUpdatedAt: new Date(),
        smsLastErrorCode: null,
      }).where(eq(queueTickets.id, row.id));
    } else if (result.errorCode === "21610") {
      // Twilio rejected this recipient after STOP; erase the destination and do not attempt again.
      await db.update(queueTickets).set({
        smsOptIn: 0,
        patientPhone: null,
        approachingSmsClaimedAt: null,
        smsDeliveryStatus: "failed",
        smsStatusUpdatedAt: new Date(),
        smsLastErrorCode: result.errorCode,
      }).where(eq(queueTickets.id, row.id));
    } else {
      await db.update(queueTickets).set({
        approachingSmsClaimedAt: null,
        smsDeliveryStatus: "failed",
        smsStatusUpdatedAt: new Date(),
        smsLastErrorCode: result.errorCode,
      }).where(eq(queueTickets.id, row.id));
    }
  }
}

async function notifyApproachingSafely(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, excludedTicketId?: number) {
  try {
    await notifyApproachingPatients(db, excludedTicketId);
  } catch (error) {
    // SMS is a convenience, so a provider outage must never undo a check-in or staff action.
    console.error("[Twilio] Queue alert dispatch failed", error);
  }
}

async function applyTransition(ticketId: number, action: "start" | "complete" | "no_show" | "rejoin") {
  const db = requireDatabase(await getDb());
  const updated = await db.transaction(async tx => {
    const [ticket] = await tx.select().from(queueTickets).where(eq(queueTickets.id, ticketId)).limit(1).for("update");
    if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "That ticket could not be found." });

    const rules = {
      start: { from: "called", to: "in_consultation" },
      complete: { from: "in_consultation", to: "completed" },
      no_show: { from: ["waiting", "called"], to: "no_show" },
      rejoin: { from: "no_show", to: "waiting" },
    } as const;
    const rule = rules[action];
    const permitted = Array.isArray(rule.from) ? rule.from.includes(ticket.status as "waiting" | "called") : ticket.status === rule.from;
    if (!permitted) {
      throw new TRPCError({ code: "CONFLICT", message: `This ticket cannot be ${action.replaceAll("_", " ")} from its current status.` });
    }

    const now = new Date();
    const changes: Partial<typeof queueTickets.$inferInsert> = { status: rule.to as typeof ticket.status };
    if (action === "start") changes.consultationStartedAt = now;
    if (action === "complete") {
      changes.completedAt = now;
      changes.patientPhone = null;
      changes.smsOptIn = 0;
      changes.approachingSmsClaimedAt = null;
    }
    if (action === "rejoin") {
      changes.queuedAt = now;
      changes.calledAt = null;
      changes.consultationStartedAt = null;
      changes.completedAt = null;
      // Keep language/consent, but allow one new approach alert for the new visit.
      changes.approachingSmsClaimedAt = null;
      changes.smsApproachingSentAt = null;
      changes.twilioMessageSid = null;
      changes.smsDeliveryStatus = "none";
      changes.smsStatusUpdatedAt = null;
      changes.smsLastErrorCode = null;
    }

    await tx.update(queueTickets).set(changes).where(eq(queueTickets.id, ticketId));
    await tx.insert(queueEvents).values({
      ticketId,
      eventType: action,
      previousStatus: ticket.status,
      nextStatus: rule.to,
    });
    const [result] = await tx.select().from(queueTickets).where(eq(queueTickets.id, ticketId)).limit(1);
    return result;
  });
  await notifyApproachingSafely(db);
  return updated;
}

const joinInput = z.object({
  name: z.string().trim().min(2, "Enter a name with at least 2 characters.").max(80),
  preferredLanguage: patientLanguageInput.default("en"),
  smsOptIn: z.boolean().default(false),
  phoneNumber: z.string().trim().max(30).optional().transform(value => value ? normalizePatientPhone(value) : undefined),
}).superRefine((value, ctx) => {
  if (value.smsOptIn && (!value.phoneNumber || !E164_PHONE_PATTERN.test(value.phoneNumber))) {
    ctx.addIssue({ code: "custom", path: ["phoneNumber"], message: "Enter an international-format phone number to receive SMS alerts." });
  }
});

export const queueRouter = router({
  /** Public board intentionally omits patient names and access keys. */
  board: publicProcedure.query(async () => {
    const db = requireDatabase(await getDb());
    const [rows, average] = await Promise.all([listActive(db), averageConsultMinutes(db)]);
    const lineup = rows.map(toPosition);
    const tickets = rows.map(row => ({
      id: row.id,
      token: formatToken(row.id),
      status: row.status,
      etaMinutes: estimateWaitMinutes(row.id, lineup, average),
    }));
    const current = rows.find(row => row.status === "called") ?? rows.find(row => row.status === "in_consultation") ?? null;
    return {
      tickets,
      current: current ? { id: current.id, token: formatToken(current.id), status: current.status } : null,
      waitingCount: rows.filter(row => row.status === "waiting").length,
      averageConsultMinutes: average,
      smsReady: getTwilioConfig() !== null,
      updatedAt: Date.now(),
    };
  }),

  /** Secure patient status uses an unguessable access key returned only at check-in. */
  myTicket: publicProcedure.input(patientKeyInput).query(async ({ input }) => {
    const db = requireDatabase(await getDb());
    const [ticket] = await db.select().from(queueTickets).where(and(eq(queueTickets.id, input.id), eq(queueTickets.accessKey, input.accessKey))).limit(1);
    if (!ticket) throw new TRPCError({ code: "NOT_FOUND", message: "We couldn't find this ticket. Check the saved link or join the queue again." });

    const [rows, average] = await Promise.all([listActive(db), averageConsultMinutes(db)]);
    const lineup = rows.map(toPosition);
    const index = lineup.findIndex(row => row.id === ticket.id);
    const patientsAhead = index < 0 ? 0 : lineup.slice(0, index).filter(row => row.status !== "completed" && row.status !== "no_show").length;
    return {
      id: ticket.id,
      token: formatToken(ticket.id),
      status: ticket.status,
      preferredLanguage: ticket.preferredLanguage,
      etaMinutes: estimateWaitMinutes(ticket.id, lineup, average),
      patientsAhead,
      averageConsultMinutes: average,
      smsOptIn: ticket.smsOptIn === 1,
      smsDeliveryStatus: ticket.smsDeliveryStatus,
      smsLastErrorCode: ticket.smsLastErrorCode,
      updatedAt: ticket.updatedAt.getTime(),
      serverNow: Date.now(),
    };
  }),

  /** Patient check-in is public; SMS contact data is stored only with explicit opt-in. */
  join: publicProcedure.input(joinInput).mutation(async ({ input }) => {
    const db = requireDatabase(await getDb());
    const accessKey = randomUUID();
    const result = await db.transaction(async tx => {
      const [created] = await tx.insert(queueTickets).values({
        accessKey,
        patientName: input.name.trim(),
        patientPhone: input.smsOptIn ? input.phoneNumber! : null,
        preferredLanguage: input.preferredLanguage,
        smsOptIn: input.smsOptIn ? 1 : 0,
      }).$returningId();
      await tx.insert(queueEvents).values({ ticketId: created.id, eventType: "joined", previousStatus: null, nextStatus: "waiting" });
      return { id: created.id, token: formatToken(created.id), accessKey };
    });
    let smsDeliveryStatus = "none";
    const config = getTwilioConfig();
    if (input.smsOptIn && input.phoneNumber && config) {
      try {
        const [rows, average] = await Promise.all([listActive(db), averageConsultMinutes(db)]);
        const etaMinutes = estimateWaitMinutes(result.id, rows.map(toPosition), average);
        const sms = await sendTwilioSms(
          input.phoneNumber,
          registrationSmsBody(input.preferredLanguage, result.token, etaMinutes),
          config,
        );
        const now = new Date();
        smsDeliveryStatus = sms.ok ? sms.status.slice(0, 24) : "failed";
        if (sms.ok) {
          await db.update(queueTickets).set({
            twilioMessageSid: sms.sid,
            smsDeliveryStatus,
            smsStatusUpdatedAt: now,
            smsLastErrorCode: null,
            ...(etaMinutes <= 10 ? { smsApproachingSentAt: now } : {}),
          }).where(eq(queueTickets.id, result.id));
        } else {
          await db.update(queueTickets).set({
            ...(sms.errorCode === "21610" ? { smsOptIn: 0, patientPhone: null } : {}),
            smsDeliveryStatus: "failed",
            smsStatusUpdatedAt: now,
            smsLastErrorCode: sms.errorCode,
          }).where(eq(queueTickets.id, result.id));
        }
      } catch {
        // Keep the check-in successful even if Twilio or its database update fails.
        smsDeliveryStatus = "failed";
        try {
          await db.update(queueTickets).set({
            smsDeliveryStatus: "failed",
            smsStatusUpdatedAt: new Date(),
            smsLastErrorCode: "SEND_ERROR",
          }).where(eq(queueTickets.id, result.id));
        } catch {
          // The ticket insert already committed; status can be reconciled by a later callback.
        }
      }
    }
    await notifyApproachingSafely(db, result.id);
    return { ...result, smsDeliveryStatus };
  }),

  /** Authenticated staff-only patient roster and clinic metrics. */
  staffSnapshot: protectedProcedure.input(z.object({ timezoneOffsetMinutes: z.number().int().min(-840).max(840).default(0) })).query(async ({ input }) => {
    const db = requireDatabase(await getDb());
    const dayStart = startOfUtcDay();
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const [active, noShows, completedToday, average, flowRows, consultRows, demoRows] = await Promise.all([
      listActive(db),
      db.select().from(queueTickets).where(and(eq(queueTickets.status, "no_show"), gte(queueTickets.updatedAt, dayStart))).orderBy(desc(queueTickets.updatedAt)),
      db.select({ id: queueTickets.id }).from(queueTickets).where(and(eq(queueTickets.status, "completed"), gte(queueTickets.completedAt, dayStart))),
      averageConsultMinutes(db),
      db.select({ createdAt: queueTickets.createdAt, completedAt: queueTickets.completedAt }).from(queueTickets)
        .where(or(gte(queueTickets.createdAt, sixHoursAgo), gte(queueTickets.completedAt, sixHoursAgo)))
        .orderBy(asc(queueTickets.createdAt)).limit(500),
      db.select({ id: queueTickets.id, consultationStartedAt: queueTickets.consultationStartedAt, completedAt: queueTickets.completedAt })
        .from(queueTickets)
        .where(and(eq(queueTickets.status, "completed"), isNotNull(queueTickets.consultationStartedAt), isNotNull(queueTickets.completedAt)))
        .orderBy(desc(queueTickets.completedAt)).limit(24),
      db.select({ id: queueTickets.id }).from(queueTickets).where(eq(queueTickets.isDemo, 1)),
    ]);
    const lineup = active.map(toPosition);
    return {
      tickets: active.map(row => ({
        id: row.id,
        token: formatToken(row.id),
        patientName: row.patientName,
        status: row.status,
        createdAt: row.createdAt.getTime(),
        queuedAt: row.queuedAt.getTime(),
        etaMinutes: estimateWaitMinutes(row.id, lineup, average),
        isDemo: row.isDemo === 1,
        smsOptIn: row.smsOptIn === 1,
        smsDeliveryStatus: row.smsDeliveryStatus,
        smsLastErrorCode: row.smsLastErrorCode,
        smsStatusUpdatedAt: row.smsStatusUpdatedAt?.getTime() ?? null,
      })),
      noShows: noShows.map(row => ({
        id: row.id,
        token: formatToken(row.id),
        patientName: row.patientName,
        updatedAt: row.updatedAt.getTime(),
        isDemo: row.isDemo === 1,
        smsOptIn: row.smsOptIn === 1,
        smsDeliveryStatus: row.smsDeliveryStatus,
        smsLastErrorCode: row.smsLastErrorCode,
        smsStatusUpdatedAt: row.smsStatusUpdatedAt?.getTime() ?? null,
      })),
      waitingCount: active.filter(row => row.status === "waiting").length,
      inConsultationCount: active.filter(row => row.status === "in_consultation").length,
      calledCount: active.filter(row => row.status === "called").length,
      completedToday: completedToday.length,
      averageConsultMinutes: average,
      hourlyFlow: buildHourlyFlow(flowRows, new Date(), input.timezoneOffsetMinutes),
      consultationTrend: buildConsultationTrend(consultRows),
      smsConfigured: getTwilioConfig() !== null,
      demoTicketCount: demoRows.length,
      updatedAt: Date.now(),
    };
  }),

  callNext: protectedProcedure.mutation(async () => {
    const db = requireDatabase(await getDb());
    const result = await db.transaction(async tx => {
      const [alreadyCalled] = await tx.select({ id: queueTickets.id }).from(queueTickets).where(eq(queueTickets.status, "called")).limit(1).for("update");
      if (alreadyCalled) throw new TRPCError({ code: "CONFLICT", message: "Finish or mark the currently called patient first." });
      const [next] = await tx.select().from(queueTickets).where(eq(queueTickets.status, "waiting")).orderBy(asc(queueTickets.queuedAt), asc(queueTickets.id)).limit(1).for("update");
      if (!next) throw new TRPCError({ code: "NOT_FOUND", message: "There are no patients waiting right now." });
      const now = new Date();
      await tx.update(queueTickets).set({ status: "called", calledAt: now }).where(and(eq(queueTickets.id, next.id), eq(queueTickets.status, "waiting")));
      await tx.insert(queueEvents).values({ ticketId: next.id, eventType: "called", previousStatus: "waiting", nextStatus: "called" });
      return { id: next.id, token: formatToken(next.id), patientName: next.patientName };
    });
    await notifyApproachingSafely(db);
    return result;
  }),

  startConsultation: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => applyTransition(input.id, "start")),
  complete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => applyTransition(input.id, "complete")),
  noShow: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => applyTransition(input.id, "no_show")),
  rejoin: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => applyTransition(input.id, "rejoin")),

  /** Add mock patients once without removing or changing any live patient rows. */
  seedDemo: protectedProcedure.mutation(async () => {
    const db = requireDatabase(await getDb());
    return db.transaction(async tx => {
      const existing = await tx.select({ id: queueTickets.id }).from(queueTickets).where(eq(queueTickets.isDemo, 1)).for("update");
      if (existing.length) return { count: existing.length, alreadySeeded: true };

      const samples = createDemoTickets(new Date());
      const created = await tx.insert(queueTickets).values(samples.map(sample => ({ ...sample, accessKey: randomUUID() }))).$returningId();
      const events = samples.flatMap((sample, index) => {
        const id = created[index]?.id;
        if (!id) return [];
        const joined = { ticketId: id, eventType: "demo_joined", previousStatus: null, nextStatus: "waiting", createdAt: sample.createdAt };
        if (sample.status === "waiting") return [joined];
        const statusAt = sample.completedAt ?? sample.calledAt ?? sample.consultationStartedAt ?? sample.createdAt;
        return [joined, {
          ticketId: id,
          eventType: `demo_${sample.status}`,
          previousStatus: "waiting",
          nextStatus: sample.status,
          createdAt: statusAt,
        }];
      });
      if (events.length) await tx.insert(queueEvents).values(events);
      return { count: created.length, alreadySeeded: false };
    });
  }),

  /** Remove only explicitly tagged mock rows and their audit events. */
  clearDemo: protectedProcedure.mutation(async () => {
    const db = requireDatabase(await getDb());
    return db.transaction(async tx => {
      const rows = await tx.select({ id: queueTickets.id }).from(queueTickets).where(eq(queueTickets.isDemo, 1)).for("update");
      if (!rows.length) return { count: 0 };
      const ids = rows.map(row => row.id);
      await tx.delete(queueEvents).where(inArray(queueEvents.ticketId, ids));
      await tx.delete(queueTickets).where(inArray(queueTickets.id, ids));
      return { count: rows.length };
    });
  }),
});
