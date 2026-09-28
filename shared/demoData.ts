import type { PatientLanguage } from "./patientI18n";
import type { QueueStatus, SmsDeliveryStatus } from "./queueLogic";

export type DemoTicketSeed = {
  patientName: string;
  preferredLanguage: PatientLanguage;
  status: QueueStatus;
  createdAt: Date;
  queuedAt: Date;
  calledAt: Date | null;
  consultationStartedAt: Date | null;
  completedAt: Date | null;
  patientPhone: null;
  smsOptIn: 0;
  isDemo: 1;
  smsDeliveryStatus: SmsDeliveryStatus;
  smsStatusUpdatedAt: Date | null;
  smsLastErrorCode: string | null;
};

const activeNames = [
  "Meera Iyer", "Arjun Reddy", "Kavya Nair", "Aarav Patel", "Sana Khan", "Vikram Rao",
  "Ananya Shah", "Dev Menon", "Ishita Das", "Rohan Kumar", "Priya Joshi", "Kabir Singh",
];
const completedNames = [
  "Nila Thomas", "Rahul Verma", "Anjali Bose", "Aditya Rao", "Farah Ali", "Suresh Pillai",
  "Diya Kapoor", "Manoj Reddy", "Leela Krishnan", "Zoya Mirza", "Neil Fernandes", "Pooja Sinha",
];
const languages: PatientLanguage[] = ["en", "hi", "ta", "te"];
const completedOffsetsMinutes = [350, 320, 290, 260, 230, 200, 170, 140, 110, 80, 50, 20];
const consultDurationsMinutes = [6, 8, 5, 12, 7, 9, 10, 4, 8, 11, 6, 7];
const waitingOffsetsMinutes = [63, 57, 50, 44, 37, 31, 25, 18, 12, 6];
const previewStatuses: SmsDeliveryStatus[] = ["delivered", "sent", "queued", "undelivered", "failed", "none", "none", "none", "none", "none"];

/** Build sample-only records. The fixed phone/opt-in values prevent any SMS from being sent to mock patients. */
export function createDemoTickets(now = new Date()): DemoTicketSeed[] {
  const at = (minutesAgo: number) => new Date(now.getTime() - minutesAgo * 60_000);
  const active = activeNames.map((patientName, index) => {
    const isConsulting = index === 0;
    const isCalled = index === 1;
    const queuedAt = at(isConsulting ? 80 : isCalled ? 72 : waitingOffsetsMinutes[index - 2]!);
    const consultationStartedAt = isConsulting ? at(6) : null;
    const calledAt = isCalled ? at(1) : null;
    const smsDeliveryStatus = isConsulting || isCalled ? "none" : previewStatuses[index - 2]!;
    const smsStatusUpdatedAt = smsDeliveryStatus === "none" ? null : at(2 + index);
    const smsLastErrorCode = smsDeliveryStatus === "undelivered" ? "30003" : smsDeliveryStatus === "failed" ? "30005" : null;
    return {
      patientName,
      preferredLanguage: languages[index % languages.length]!,
      status: isConsulting ? "in_consultation" as const : isCalled ? "called" as const : "waiting" as const,
      createdAt: queuedAt,
      queuedAt,
      calledAt,
      consultationStartedAt,
      completedAt: null,
      patientPhone: null,
      smsOptIn: 0 as const,
      isDemo: 1 as const,
      smsDeliveryStatus,
      smsStatusUpdatedAt,
      smsLastErrorCode,
    };
  });

  const completed = completedNames.map((patientName, index) => {
    const createdAt = at(completedOffsetsMinutes[index]!);
    const consultationStartedAt = new Date(createdAt.getTime() + 2 * 60_000);
    const completedAt = new Date(consultationStartedAt.getTime() + consultDurationsMinutes[index]! * 60_000);
    return {
      patientName,
      preferredLanguage: languages[(index + 1) % languages.length]!,
      status: "completed" as const,
      createdAt,
      queuedAt: createdAt,
      calledAt: consultationStartedAt,
      consultationStartedAt,
      completedAt,
      patientPhone: null,
      smsOptIn: 0 as const,
      isDemo: 1 as const,
      smsDeliveryStatus: "none" as const,
      smsStatusUpdatedAt: null,
      smsLastErrorCode: null,
    };
  });

  const missedAt = at(55);
  const noShow: DemoTicketSeed = {
    patientName: "Tara Srinivasan",
    preferredLanguage: "ta",
    status: "no_show",
    createdAt: missedAt,
    queuedAt: missedAt,
    calledAt: null,
    consultationStartedAt: null,
    completedAt: null,
    patientPhone: null,
    smsOptIn: 0,
    isDemo: 1,
    smsDeliveryStatus: "none",
    smsStatusUpdatedAt: null,
    smsLastErrorCode: null,
  };

  return [...active, ...completed, noShow];
}
