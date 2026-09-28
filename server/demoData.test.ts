import { describe, expect, it } from "vitest";
import { createDemoTickets } from "../shared/demoData";

describe("hackathon demo dataset", () => {
  it("builds 25 realistic records with a populated active queue and analytics history", () => {
    const now = new Date("2026-09-28T08:00:00.000Z");
    const records = createDemoTickets(now);
    const active = records.filter(record => ["waiting", "called", "in_consultation"].includes(record.status));
    const completed = records.filter(record => record.status === "completed");

    expect(records).toHaveLength(25);
    expect(active).toHaveLength(12);
    expect(active.filter(record => record.status === "waiting")).toHaveLength(10);
    expect(completed).toHaveLength(12);
    expect(records.filter(record => record.status === "no_show")).toHaveLength(1);
    expect(completed.every(record => record.completedAt! > record.consultationStartedAt!)).toBe(true);
    expect(completed.some(record => record.createdAt < new Date(now.getTime() - 6 * 60 * 60_000))).toBe(false);
  });

  it("marks every mock row as demo and never opts a mock phone into real SMS", () => {
    const records = createDemoTickets(new Date("2026-09-28T08:00:00.000Z"));
    expect(records.every(record => record.isDemo === 1)).toBe(true);
    expect(records.every(record => record.patientPhone === null && record.smsOptIn === 0)).toBe(true);
    expect(records.map(record => record.smsDeliveryStatus)).toEqual(expect.arrayContaining(["delivered", "sent", "queued", "undelivered", "failed"]));
  });
});
