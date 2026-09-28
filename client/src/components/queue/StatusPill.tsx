import type { QueueStatus } from "@shared/queueLogic";
import { patientCopy, type PatientLanguage } from "@shared/patientI18n";

const labels: Record<QueueStatus, string> = {
  waiting: "Waiting",
  called: "Called next",
  in_consultation: "In consultation",
  completed: "Completed",
  no_show: "No-show",
};

const styles: Record<QueueStatus, string> = {
  waiting: "bg-amber-50 text-amber-800 ring-amber-200",
  called: "bg-teal-50 text-teal-800 ring-teal-200",
  in_consultation: "bg-sky-50 text-sky-800 ring-sky-200",
  completed: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  no_show: "bg-rose-50 text-rose-800 ring-rose-200",
};

export function StatusPill({ status, language = "en" }: { status: QueueStatus; language?: PatientLanguage }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset ${styles[status]}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "waiting" ? "bg-amber-500" : status === "called" ? "bg-teal-600" : status === "in_consultation" ? "bg-sky-600" : status === "completed" ? "bg-emerald-600" : "bg-rose-500"}`} />
      {patientCopy[language].statusLabels[status] ?? labels[status]}
    </span>
  );
}
