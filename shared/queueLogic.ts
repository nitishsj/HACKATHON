export type QueueStatus =
  | "waiting"
  | "called"
  | "in_consultation"
  | "completed"
  | "no_show";

export type SmsDeliveryStatus =
  | "none" | "accepted" | "scheduled" | "queued" | "sending" | "sent"
  | "delivered" | "undelivered" | "failed" | "canceled" | "read";

export type QueuePosition = {
  id: number;
  status: QueueStatus;
  queuedAt: Date;
  consultationStartedAt: Date | null;
};

export type QueueFlowEvent = { createdAt: Date; completedAt: Date | null };
export type HourlyFlowPoint = { hour: number; checkIns: number; completed: number };
export type ConsultationRecord = { id: number; consultationStartedAt: Date | null; completedAt: Date | null };
export type ConsultationTrendPoint = { token: string; completedAt: number; durationMinutes: number };
export const APPROACHING_SMS_THRESHOLD_MINUTES = 10;

/** Normalize common Indian entry formats to E.164; 10 local digits default to +91. */
export function normalizePatientPhone(input: string): string {
  const value = input.trim();
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  if (value.startsWith("+")) return `+${digits}`;
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

export function formatToken(id: number): string {
  return `CQ-${String(id).padStart(3, "0")}`;
}

export function isWithinSmsApproachWindow(status: QueueStatus, etaMinutes: number): boolean {
  return status === "waiting" && Number.isFinite(etaMinutes) && etaMinutes <= APPROACHING_SMS_THRESHOLD_MINUTES;
}

export function isQueueSmsDue(status: QueueStatus, etaMinutes: number): boolean {
  return status === "called" || isWithinSmsApproachWindow(status, etaMinutes);
}

/** Return the newest twelve valid completed consultations in chronological order. */
export function buildConsultationTrend(records: ConsultationRecord[]): ConsultationTrendPoint[] {
  return [...records]
    .filter(record => record.consultationStartedAt && record.completedAt)
    .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime())
    .filter(record => {
      const minutes = (record.completedAt!.getTime() - record.consultationStartedAt!.getTime()) / 60_000;
      return Number.isFinite(minutes) && minutes >= 1 && minutes <= 90;
    })
    .slice(-12)
    .map(record => ({
      token: formatToken(record.id),
      completedAt: record.completedAt!.getTime(),
      durationMinutes: Math.round(((record.completedAt!.getTime() - record.consultationStartedAt!.getTime()) / 60_000) * 10) / 10,
    }));
}

/**
 * Estimate wait from the live line. Only patients ahead count; the current
 * consultation is discounted by its elapsed time. Estimates are rounded up
 * to avoid telling patients to arrive later than is safe.
 */
export function estimateWaitMinutes(
  ticketId: number,
  lineup: QueuePosition[],
  averageConsultMinutes: number,
  now = new Date(),
): number {
  const index = lineup.findIndex(ticket => ticket.id === ticketId);
  if (index < 0 || lineup[index]?.status !== "waiting") return 0;

  const earlier = lineup.slice(0, index);
  const average = Math.max(1, averageConsultMinutes);
  const activeConsultation = earlier.find(ticket => ticket.status === "in_consultation");
  const elapsedMinutes = activeConsultation?.consultationStartedAt
    ? Math.max(0, (now.getTime() - activeConsultation.consultationStartedAt.getTime()) / 60_000)
    : 0;
  const consultationRemaining = activeConsultation
    ? Math.max(0, average - elapsedMinutes)
    : 0;
  const calledAhead = earlier.filter(ticket => ticket.status === "called").length;
  const waitingAhead = earlier.filter(ticket => ticket.status === "waiting").length;

  return Math.max(0, Math.ceil(consultationRemaining + (calledAhead + waitingAhead) * average));
}

/** Decrement a server-computed ETA snapshot locally, without another request each second. */
export function getEtaCountdownSeconds(etaMinutes: number, snapshotAt: number, now: number): number {
  if (!Number.isFinite(etaMinutes) || !Number.isFinite(snapshotAt) || !Number.isFinite(now)) return 0;
  const initialSeconds = Math.max(0, Math.ceil(etaMinutes * 60));
  const elapsedSeconds = Math.max(0, Math.floor((now - snapshotAt) / 1000));
  return Math.max(0, initialSeconds - elapsedSeconds);
}

/** Bucket patient check-ins and completions into the current and previous five hours for the viewer's timezone. */
export function buildHourlyFlow(events: QueueFlowEvent[], now = new Date(), timezoneOffsetMinutes = 0): HourlyFlowPoint[] {
  const hourMs = 60 * 60 * 1000;
  const offsetMs = timezoneOffsetMinutes * 60_000;
  const currentLocalHour = new Date(now.getTime() - offsetMs);
  currentLocalHour.setUTCHours(currentLocalHour.getUTCHours(), 0, 0, 0);
  const firstLocalHour = currentLocalHour.getTime() - 5 * hourMs;
  const buckets = Array.from({ length: 6 }, (_, index) => ({
    hour: firstLocalHour + index * hourMs + offsetMs,
    checkIns: 0,
    completed: 0,
  }));

  const bucketFor = (time: number) => {
    const index = Math.floor((time - offsetMs - firstLocalHour) / hourMs);
    return index >= 0 && index < buckets.length ? buckets[index] : undefined;
  };
  for (const event of events) {
    const checkedIn = bucketFor(event.createdAt.getTime());
    if (checkedIn) checkedIn.checkIns += 1;
    if (event.completedAt) {
      const finished = bucketFor(event.completedAt.getTime());
      if (finished) finished.completed += 1;
    }
  }
  return buckets;
}
