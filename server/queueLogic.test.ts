import { describe, expect, it } from "vitest";
import { buildConsultationTrend, buildHourlyFlow, estimateWaitMinutes, formatToken, getEtaCountdownSeconds, isQueueSmsDue, isWithinSmsApproachWindow, normalizePatientPhone, type QueuePosition } from "../shared/queueLogic";

const now = new Date("2026-09-28T08:00:00.000Z");
function patient(id: number, status: QueuePosition["status"], startedAt: Date | null = null): QueuePosition {
  return { id, status, queuedAt: new Date(now.getTime() + id * 1000), consultationStartedAt: startedAt };
}

describe("queue ETA and analytics helpers", () => {
  it("normalizes common Indian phone entry formats to E.164", () => {
    expect(normalizePatientPhone("+91 98765 43210")).toBe("+919876543210");
    expect(normalizePatientPhone("98765-43210")).toBe("+919876543210");
    expect(normalizePatientPhone("91 98765 43210")).toBe("+919876543210");
    expect(normalizePatientPhone("")).toBe("");
  });

  it("formats short, sequential-looking ticket IDs without truncation", () => {
    expect(formatToken(7)).toBe("CQ-007");
    expect(formatToken(1204)).toBe("CQ-1204");
  });

  it("subtracts elapsed consultation time and counts patients ahead", () => {
    const lineup = [
      patient(1, "in_consultation", new Date(now.getTime() - 4 * 60_000)),
      patient(2, "called"),
      patient(3, "waiting"),
      patient(4, "waiting"),
    ];
    expect(estimateWaitMinutes(4, lineup, 8, now)).toBe(20);
  });

  it("returns zero for called and in-consultation patients", () => {
    const lineup = [patient(1, "called"), patient(2, "in_consultation"), patient(3, "waiting")];
    expect(estimateWaitMinutes(1, lineup, 7, now)).toBe(0);
    expect(estimateWaitMinutes(2, lineup, 7, now)).toBe(0);
  });

  it("does not produce negative ETA when the active consultation ran long", () => {
    const lineup = [
      patient(1, "in_consultation", new Date(now.getTime() - 18 * 60_000)),
      patient(2, "waiting"),
    ];
    expect(estimateWaitMinutes(2, lineup, 7, now)).toBe(0);
  });

  it("returns zero for tickets not currently in the lineup", () => {
    expect(estimateWaitMinutes(99, [patient(1, "waiting")], 7, now)).toBe(0);
  });

  it("decrements a server ETA snapshot each second and never becomes negative", () => {
    const snapshotAt = now.getTime();
    expect(getEtaCountdownSeconds(12, snapshotAt, snapshotAt)).toBe(720);
    expect(getEtaCountdownSeconds(12, snapshotAt, snapshotAt + 37_000)).toBe(683);
    expect(getEtaCountdownSeconds(1, snapshotAt, snapshotAt + 80_000)).toBe(0);
    expect(getEtaCountdownSeconds(5, snapshotAt, snapshotAt - 1000)).toBe(300);
    expect(getEtaCountdownSeconds(Number.NaN, snapshotAt, snapshotAt)).toBe(0);
  });

  it("groups check-ins and completions by the current and previous five hours", () => {
    const points = buildHourlyFlow([
      { createdAt: new Date("2026-09-28T08:10:00.000Z"), completedAt: new Date("2026-09-28T08:35:00.000Z") },
      { createdAt: new Date("2026-09-28T06:05:00.000Z"), completedAt: null },
      { createdAt: new Date("2026-09-28T02:55:00.000Z"), completedAt: new Date("2026-09-28T03:15:00.000Z") },
    ], new Date("2026-09-28T08:42:00.000Z"));
    expect(points).toHaveLength(6);
    expect(points.map(point => new Date(point.hour).toISOString())).toEqual([
      "2026-09-28T03:00:00.000Z",
      "2026-09-28T04:00:00.000Z",
      "2026-09-28T05:00:00.000Z",
      "2026-09-28T06:00:00.000Z",
      "2026-09-28T07:00:00.000Z",
      "2026-09-28T08:00:00.000Z",
    ]);
    expect(points[0]).toMatchObject({ checkIns: 0, completed: 1 });
    expect(points[3]).toMatchObject({ checkIns: 1, completed: 0 });
    expect(points[5]).toMatchObject({ checkIns: 1, completed: 1 });
  });

  it("aligns analytics bucket boundaries to the clinic staff timezone", () => {
    const points = buildHourlyFlow([
      { createdAt: new Date("2026-09-28T08:35:00.000Z"), completedAt: new Date("2026-09-28T08:40:00.000Z") },
    ], new Date("2026-09-28T08:42:00.000Z"), -330);
    expect(new Date(points[5]!.hour).toISOString()).toBe("2026-09-28T08:30:00.000Z");
    expect(points[5]).toMatchObject({ checkIns: 1, completed: 1 });
  });

  it("notifies only waiting patients at or inside the ten-minute threshold", () => {
    expect(isWithinSmsApproachWindow("waiting", 10)).toBe(true);
    expect(isWithinSmsApproachWindow("waiting", 0)).toBe(true);
    expect(isWithinSmsApproachWindow("waiting", 11)).toBe(false);
    expect(isWithinSmsApproachWindow("called", 0)).toBe(false);
    expect(isQueueSmsDue("called", 0)).toBe(true);
    expect(isQueueSmsDue("waiting", 11)).toBe(false);
    expect(isWithinSmsApproachWindow("waiting", Number.NaN)).toBe(false);
  });

  it("builds recent consult chart points in time order and excludes invalid durations", () => {
    const newest = new Date("2026-09-28T08:30:00.000Z");
    const trend = buildConsultationTrend([
      { id: 12, consultationStartedAt: new Date(newest.getTime() - 11 * 60_000), completedAt: newest },
      { id: 11, consultationStartedAt: new Date(newest.getTime() - 5 * 60_000), completedAt: new Date(newest.getTime() - 20 * 60_000) },
      { id: 10, consultationStartedAt: new Date(newest.getTime() - 14 * 60_000), completedAt: new Date(newest.getTime() - 10 * 60_000) },
    ]);
    expect(trend).toEqual([
      { token: "CQ-010", completedAt: new Date("2026-09-28T08:20:00.000Z").getTime(), durationMinutes: 4 },
      { token: "CQ-012", completedAt: newest.getTime(), durationMinutes: 11 },
    ]);
  });
});
