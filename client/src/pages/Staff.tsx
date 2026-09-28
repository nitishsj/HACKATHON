import DashboardLayout from "@/components/DashboardLayout";
import { StatusPill } from "@/components/queue/StatusPill";
import { TextShimmer } from "@/components/21st/TextShimmer";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { ConsultationTrendPoint, HourlyFlowPoint, SmsDeliveryStatus } from "@shared/queueLogic";
import { Activity, ArrowRight, BellRing, Check, Clock3, Copy, CornerDownRight, Headset, MonitorPlay, MoreHorizontal, PhoneCall, Play, Printer, QrCode, RefreshCw, RotateCcw, SkipForward, Sparkles, UserRoundCheck, Users, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";

function SmsDeliveryBadge({ status, smsOptIn, isDemo, errorCode, updatedAt }: {
  status: string;
  smsOptIn: boolean;
  isDemo: boolean;
  errorCode: string | null;
  updatedAt: number | null;
}) {
  const labels: Record<SmsDeliveryStatus, string> = {
    none: smsOptIn ? "Not sent" : "No SMS opt-in",
    accepted: "Accepted",
    scheduled: "Scheduled",
    queued: "Queued",
    sending: "Sending",
    sent: "Sent · awaiting delivery",
    delivered: "Delivered",
    undelivered: "Undelivered",
    failed: "Failed",
    canceled: "Canceled",
    read: "Read",
  };
  const validStatus = status in labels ? status as SmsDeliveryStatus : "none";
  const tone = ["failed", "undelivered"].includes(validStatus)
    ? "bg-[#fff0ee] text-[#a44e42]"
    : ["delivered", "read"].includes(validStatus)
      ? "bg-[#e8f5ee] text-[#3d836b]"
      : ["queued", "accepted", "scheduled", "sending", "sent"].includes(validStatus)
        ? "bg-[#fff5e3] text-[#977335]"
        : "bg-[#f0f3f1] text-[#76867d]";
  const label = `${isDemo ? "DEMO · " : ""}${labels[validStatus]}`;
  const updated = updatedAt ? ` · updated ${new Date(updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}` : "";
  const error = errorCode ? ` · Twilio code ${errorCode}` : "";
  return <span title={`${label}${error}${updated}`} className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2 py-1 text-[9px] font-bold ${tone}`}><span className={`size-1.5 shrink-0 rounded-full ${["failed", "undelivered"].includes(validStatus) ? "bg-[#b85b4d]" : ["delivered", "read"].includes(validStatus) ? "bg-[#438b6c]" : ["queued", "accepted", "scheduled", "sending", "sent"].includes(validStatus) ? "bg-[#bf9747]" : "bg-[#9ca9a1]"}`} />SMS · {label}</span>;
}

function Metric({ label, value, hint, icon: Icon, tone }: { label: string; value: string | number; hint: string; icon: typeof Users; tone: string }) {
  return (
    <div className="rounded-[20px] border border-[#e7ede8] bg-white p-4 shadow-[0_4px_18px_rgba(27,67,53,.025)] sm:p-5">
      <div className="flex items-start justify-between gap-2"><p className="text-[11px] font-bold uppercase tracking-[.12em] text-[#82918a]">{label}</p><span className={`grid size-8 place-items-center rounded-xl ${tone}`}><Icon className="size-4" /></span></div>
      <p className="mt-3 text-[30px] font-bold leading-none tracking-[-.05em] text-[#23423b]">{value}</p>
      <p className="mt-2 text-[11px] text-[#8b9992]">{hint}</p>
    </div>
  );
}

function HourlyFlowChart({ points }: { points: HourlyFlowPoint[] }) {
  const peak = Math.max(1, ...points.flatMap(point => [point.checkIns, point.completed]));
  return (
    <div className="mt-5 border-t border-[#edf1ee] pt-4">
      <div className="flex items-center justify-between gap-2"><p className="text-[11px] font-bold text-[#61766b]">Patient flow · last 6 hours</p><div className="flex gap-3 text-[9px] text-[#8a9990]"><span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-[#69aa88]" />Check-in</span><span className="flex items-center gap-1"><i className="size-1.5 rounded-full bg-[#b9cabc]" />Complete</span></div></div>
      <div className="mt-3 grid grid-cols-6 gap-1.5">
        {points.map(point => {
          const checkHeight = point.checkIns ? Math.max(5, (point.checkIns / peak) * 44) : 2;
          const completedHeight = point.completed ? Math.max(5, (point.completed / peak) * 44) : 2;
          return <div key={point.hour} className="flex flex-col items-center gap-1.5" title={`${point.checkIns} check-ins · ${point.completed} completed`}>
            <div className="flex h-12 items-end gap-1"><span className={`w-2 rounded-t-sm ${point.checkIns ? "bg-[#69aa88]" : "bg-[#edf1ed]"}`} style={{ height: `${checkHeight}px` }} /><span className={`w-2 rounded-t-sm ${point.completed ? "bg-[#b9cabc]" : "bg-[#edf1ed]"}`} style={{ height: `${completedHeight}px` }} /></div>
            <span className="text-[9px] text-[#91a097]">{new Date(point.hour).toLocaleTimeString([], { hour: "numeric" })}</span>
          </div>;
        })}
      </div>
    </div>
  );
}

function StaffContent() {
  const utils = trpc.useUtils();
  const patientCheckInUrl = useMemo(() => typeof window === "undefined" ? "" : `${window.location.origin}/`, []);
  const copyPatientCheckInLink = async () => {
    try {
      if (!navigator.clipboard) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(patientCheckInUrl);
      toast.success("Patient check-in link copied");
    } catch {
      toast.error("Copy is unavailable; patients can scan the QR instead.");
    }
  };
  const timezoneOffsetMinutes = useMemo(() => new Date().getTimezoneOffset(), []);
  const data = trpc.queue.staffSnapshot.useQuery({ timezoneOffsetMinutes }, { refetchInterval: 3500, staleTime: 1200, retry: false });
  const refreshQueue = () => {
    void utils.queue.staffSnapshot.invalidate();
    void utils.queue.board.invalidate();
  };
  const handleError = (error: { message: string }) => toast.error(error.message);
  const next = trpc.queue.callNext.useMutation({ onSuccess: result => { toast.success(`${result.token} — ${result.patientName} called`); refreshQueue(); }, onError: handleError });
  const start = trpc.queue.startConsultation.useMutation({ onSuccess: refreshQueue, onError: handleError });
  const complete = trpc.queue.complete.useMutation({ onSuccess: () => { toast.success("Visit completed"); refreshQueue(); }, onError: handleError });
  const noShow = trpc.queue.noShow.useMutation({ onSuccess: () => { toast.message("Marked as no-show"); refreshQueue(); }, onError: handleError });
  const rejoin = trpc.queue.rejoin.useMutation({ onSuccess: () => { toast.success("Patient returned to the end of the queue"); refreshQueue(); }, onError: handleError });
  const seedDemo = trpc.queue.seedDemo.useMutation({ onSuccess: result => { toast.success(result.alreadySeeded ? `Demo data already loaded · ${result.count} records` : `${result.count} demo records added`); refreshQueue(); }, onError: handleError });
  const clearDemo = trpc.queue.clearDemo.useMutation({ onSuccess: result => { toast.success(`${result.count} demo records removed`); refreshQueue(); }, onError: handleError });

  const called = data.data?.tickets.find(ticket => ticket.status === "called");
  const inConsultation = data.data?.tickets.find(ticket => ticket.status === "in_consultation");
  const waiting = data.data?.tickets.filter(ticket => ticket.status === "waiting") ?? [];
  const busy = next.isPending || start.isPending || complete.isPending || noShow.isPending || rejoin.isPending;
  const dateLabel = new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <DashboardLayout>
      <main className="min-h-screen bg-[#f5f7f4] px-4 pb-10 pt-5 sm:px-7 sm:pt-8 lg:px-10">
        <div className="mx-auto max-w-[1260px]">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.17em] text-[#82968d]"><Headset className="size-4" /> Clinic operations · {dateLabel}</div>
              <h1 className="text-[30px] font-bold tracking-[-.045em] text-[#203d36] sm:text-[36px]">Good morning, team.</h1>
              <p className="mt-2 text-sm text-[#77877f]">A clear view of today’s line and the next best action.</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/display" className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#dfe8e1] bg-white px-3.5 text-[12px] font-semibold text-[#47695f] shadow-sm transition hover:border-[#bad8ca]"><MonitorPlay className="size-4" /> Waiting room</Link>
              <Button variant="outline" onClick={() => { void data.refetch(); }} className="h-10 rounded-xl border-[#dfe8e1] bg-white px-3 text-[#54736a]" aria-label="Refresh queue"><RefreshCw className={`size-4 ${data.isFetching ? "animate-spin" : ""}`} /></Button>
            </div>
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Metric label="Waiting" value={data.data?.waitingCount ?? "—"} hint="People in line right now" icon={Users} tone="bg-[#fff4df] text-[#be8527]" />
            <Metric label="Called" value={data.data?.calledCount ?? "—"} hint="Ready for the next step" icon={BellRing} tone="bg-[#e5f4ef] text-[#36876f]" />
            <Metric label="With clinician" value={data.data?.inConsultationCount ?? "—"} hint="Consultations in progress" icon={Activity} tone="bg-[#e7f0f8] text-[#4e81a5]" />
            <Metric label="Avg. consultation" value={data.data ? `${data.data.averageConsultMinutes}m` : "—"} hint={`${data.data?.completedToday ?? "—"} visits completed today`} icon={Clock3} tone="bg-[#f0eafa] text-[#8a6baf]" />
          </div>

          {data.isError ? <div role="alert" className="mt-5 rounded-2xl border border-[#efd6d0] bg-[#fff7f5] p-4 text-sm text-[#89554b]">Queue data is unavailable. Check your connection, then refresh. {data.error.message.includes("UNAUTHORIZED") ? "Please sign in again." : ""}</div> : null}

          <div className="mt-6 grid items-start gap-5 xl:grid-cols-[1.45fr_.75fr]">
            <section className="overflow-hidden rounded-[22px] border border-[#e4ebe5] bg-white shadow-[0_8px_28px_rgba(25,66,54,.035)]">
              <div className="flex flex-col justify-between gap-3 border-b border-[#edf1ee] px-5 py-5 sm:flex-row sm:items-center sm:px-6">
                <div><div className="flex items-center gap-2"><h2 className="text-[17px] font-bold tracking-[-.03em] text-[#29463e]">Live queue</h2><span className="rounded-full bg-[#e8f5ee] px-2 py-1 text-[9px] font-bold uppercase tracking-[.14em] text-[#3e8b70]">Today</span></div><p className="mt-1 text-[11px] text-[#8a9991]">{data.data?.tickets.length ?? 0} active token{data.data?.tickets.length === 1 ? "" : "s"} · names shown only in the staff view</p></div>
                <div className="flex items-center gap-2 text-[11px] text-[#8b9991]"><span className="relative flex size-2"><span className="live-dot absolute inline-flex size-full rounded-full bg-[#5db395] opacity-75" /><span className="relative inline-flex size-2 rounded-full bg-[#368f73]" /></span><TextShimmer as="span" duration={3}>Live sync</TextShimmer></div>
              </div>

              {called || inConsultation ? (
                <div className="mx-5 mt-5 overflow-hidden rounded-[18px] bg-[#173e37] text-white sm:mx-6">
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <div className="flex items-center gap-4">
                      <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/10 text-[#c6e6d8]"><UserRoundCheck className="size-6" /></div>
                      <div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#95c8b4]">{called ? "Next to see the clinician" : "Consultation in progress"}</p><p className="mt-1 text-[19px] font-bold tracking-[-.03em]">{(called ?? inConsultation)?.patientName}</p><div className="mt-1.5 flex flex-wrap items-center gap-2"><p className="text-[11px] text-[#c1d5cd]">Token {(called ?? inConsultation)?.token}</p>{(called ?? inConsultation)?.isDemo ? <span className="rounded-full bg-white/10 px-2 py-0.5 text-[9px] font-bold text-[#d7eadf]">DEMO</span> : null}<SmsDeliveryBadge status={(called ?? inConsultation)?.smsDeliveryStatus ?? "none"} smsOptIn={(called ?? inConsultation)?.smsOptIn ?? false} isDemo={(called ?? inConsultation)?.isDemo ?? false} errorCode={(called ?? inConsultation)?.smsLastErrorCode ?? null} updatedAt={(called ?? inConsultation)?.smsStatusUpdatedAt ?? null} /></div></div>
                    </div>
                    {called ? <div className="flex flex-wrap gap-2">
                      <Button disabled={busy} onClick={() => start.mutate({ id: called.id })} className="h-10 rounded-xl bg-[#a5d7bd] px-4 text-[12px] font-bold text-[#173e37] hover:bg-[#bce4ce]"><Play className="size-4" /> Start visit</Button>
                      <Button disabled={busy} onClick={() => noShow.mutate({ id: called.id })} variant="outline" className="h-10 rounded-xl border-white/20 bg-white/5 px-3 text-[11px] text-white hover:bg-white/10"><SkipForward className="size-4" /> No-show</Button>
                    </div> : <Button disabled={busy} onClick={() => complete.mutate({ id: inConsultation!.id })} className="h-10 rounded-xl bg-[#a5d7bd] px-4 text-[12px] font-bold text-[#173e37] hover:bg-[#bce4ce]"><Check className="size-4" /> Complete visit</Button>}
                  </div>
                </div>
              ) : null}

              <div className="divide-y divide-[#f0f3f1]">
                {data.isLoading ? <div className="grid min-h-52 place-items-center text-sm text-[#84948c]"><span className="flex items-center gap-2"><span className="size-4 animate-spin rounded-full border-2 border-[#d9e7df] border-t-[#29806e]" />Loading queue…</span></div> : null}
                {!data.isLoading && waiting.length === 0 && !called && !inConsultation ? (
                  <div className="px-6 py-10 text-center">
                    <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#edf5ef] text-[#52917c]"><Check className="size-5" /></div>
                    <p className="mt-3 text-sm font-bold text-[#456157]">The queue is clear.</p>
                    <p className="mt-1 text-xs text-[#8b9992]">New patient check-ins appear here automatically.</p>
                    <Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#38836e]">Open patient check-in <ArrowRight className="size-3.5" /></Link>
                  </div>
                ) : null}
                {waiting.map((patient, index) => (
                  <div key={patient.id} className="flex flex-col gap-3 px-5 py-4 transition-colors hover:bg-[#fbfcfb] sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div className="flex min-w-0 items-center gap-3.5">
                      <span className="grid size-10 shrink-0 place-items-center rounded-[14px] bg-[#f2f6f2] text-[11px] font-bold text-[#659080]">{String(index + 1).padStart(2, "0")}</span>
                      <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="truncate text-sm font-bold text-[#334e44]">{patient.patientName}</span>{patient.isDemo ? <span className="rounded-full bg-[#eef1f2] px-1.5 py-0.5 text-[8px] font-bold text-[#738078]">DEMO</span> : null}<StatusPill status={patient.status} /></div><p className="mt-1 text-[11px] text-[#91a098]">{patient.token} <span className="mx-1">·</span> joined {new Date(patient.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</p><div className="mt-1.5"><SmsDeliveryBadge status={patient.smsDeliveryStatus} smsOptIn={patient.smsOptIn} isDemo={patient.isDemo} errorCode={patient.smsLastErrorCode} updatedAt={patient.smsStatusUpdatedAt} /></div></div>
                    </div>
                    <div className="flex items-center justify-between gap-3 pl-[54px] sm:pl-0"><span className="text-[11px] font-medium text-[#7d8c84]">ETA <strong className="ml-1 text-[#4b695d]">{patient.etaMinutes <= 0 ? "Soon" : `~${patient.etaMinutes} min`}</strong></span><Button size="sm" disabled={busy || Boolean(called) || next.isPending || index !== 0} onClick={() => next.mutate()} className="h-8 rounded-lg bg-[#e5f2ec] px-3 text-[11px] font-bold text-[#31745f] shadow-none hover:bg-[#d5eadf]">{next.isPending && index === 0 ? "Calling…" : index === 0 && !called ? "Call next" : "In line"}{index === 0 && !called ? <PhoneCall className="size-3.5" /> : null}</Button></div>
                  </div>
                ))}
              </div>
              {waiting.length > 1 && !called ? <div className="border-t border-[#edf1ee] bg-[#fbfcfb] px-5 py-3 text-center text-[10px] text-[#909e97]">Call the next patient when the clinician is ready. Queue positions update automatically.</div> : null}
            </section>

            <aside className="space-y-5">
              <section className="rounded-[22px] border border-[#e4ebe5] bg-white p-5 shadow-[0_8px_28px_rgba(25,66,54,.035)] sm:p-6">
                <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8b9c93]">Clinic insight</p><h2 className="mt-2 text-[18px] font-bold tracking-[-.035em] text-[#2d4a40]">A better ETA, every visit.</h2></div><span className="grid size-9 place-items-center rounded-xl bg-[#eef5ee] text-[#6a9a7e]"><Sparkles className="size-4" /></span></div>
                <div className="mt-5 rounded-[16px] bg-[#f5f8f5] p-4"><div className="flex items-baseline justify-between"><span className="text-[11px] text-[#71847b]">Recent consult average</span><span className="text-[21px] font-bold tracking-[-.04em] text-[#326953]">{data.data ? `${data.data.averageConsultMinutes} min` : "—"}</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e5ece6]"><div className="h-full rounded-full bg-[#7cb89a] transition-[width] duration-500" style={{ width: `${Math.min(100, ((data.data?.averageConsultMinutes ?? 7) / 30) * 100)}%` }} /></div><p className="mt-3 text-[10px] leading-4 text-[#8a9991]">Learns from completed visits · starts with a 7-minute estimate until enough data comes in.</p></div>
                {data.data?.hourlyFlow ? <HourlyFlowChart points={data.data.hourlyFlow} /> : null}
                {data.data ? <ConsultationTrendChart points={data.data.consultationTrend} average={data.data.averageConsultMinutes} /> : null}
                <div className="mt-5 flex items-center justify-between border-t border-[#edf1ee] pt-4"><span className="flex items-center gap-2 text-[11px] text-[#7f8f87]"><Clock3 className="size-4 text-[#74a18e]" /> Visits completed today</span><span className="text-sm font-bold text-[#3f6557]">{data.data?.completedToday ?? "—"}</span></div>
                <div className="mt-3 flex items-center justify-between border-t border-[#edf1ee] pt-3"><span className="text-[11px] text-[#7f8f87]">Automated SMS alerts</span><span className={`rounded-full px-2.5 py-1 text-[9px] font-bold ${data.data?.smsConfigured ? "bg-[#e8f5ee] text-[#3d836b]" : "bg-[#f4f1e9] text-[#967c4e]"}`}>{data.data?.smsConfigured ? "Ready" : "Twilio setup needed"}</span></div>
              </section>

              <section id="carequeue-checkin-qr" className="rounded-[22px] border border-[#dce9df] bg-white p-5 shadow-[0_8px_28px_rgba(25,66,54,.035)] sm:p-6">
                <div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#8b9c93]">Patient access</p><h2 className="mt-2 text-[18px] font-bold tracking-[-.035em] text-[#2d4a40]">Scan to check in &amp; track</h2></div><span className="grid size-9 place-items-center rounded-xl bg-[#eef5ee] text-[#6a9a7e]"><QrCode className="size-4" /></span></div>
                <p className="mt-2 text-[11px] leading-5 text-[#7c8d82]">Print this clinic QR. Patients scan to open check-in; after joining, their private live ETA appears on their phone.</p>
                <div className="mx-auto mt-4 grid w-fit place-items-center rounded-2xl border border-[#eef2ee] bg-white p-3"><QRCodeSVG value={patientCheckInUrl || "/"} size={184} level="M" includeMargin title="CareQueue patient check-in QR code" /></div>
                <p className="mt-3 break-all text-center text-[9px] text-[#93a097]">{patientCheckInUrl}</p>
                <div data-print-hide className="mt-4 grid grid-cols-2 gap-2"><Button variant="outline" onClick={() => window.print()} className="h-10 rounded-xl border-[#dfe9e2] bg-white text-[11px] font-bold text-[#46685a]"><Printer className="size-3.5" /> Print QR</Button><Button variant="outline" onClick={() => void copyPatientCheckInLink()} className="h-10 rounded-xl border-[#dfe9e2] bg-white text-[11px] font-bold text-[#46685a]"><Copy className="size-3.5" /> Copy link</Button></div>
              </section>

              {data.data?.noShows.length ? <section className="rounded-[22px] border border-[#f0e5dd] bg-[#fffdfa] p-5 shadow-[0_8px_28px_rgba(25,66,54,.02)]"><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#ad9177]">Needs follow-up</p><h2 className="mt-1 text-[15px] font-bold text-[#655345]">Missed patients</h2></div><CornerDownRight className="size-4 text-[#b39d87]" /></div><div className="mt-3 space-y-2">{data.data.noShows.slice(0, 4).map(patient => <div key={patient.id} className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2.5"><div className="min-w-0"><p className="truncate text-[12px] font-semibold text-[#604e41]">{patient.patientName}{patient.isDemo ? <span className="ml-1.5 text-[8px] font-bold text-[#87938c]">DEMO</span> : null}</p><p className="mb-1 text-[10px] text-[#9a8878]">{patient.token}</p><SmsDeliveryBadge status={patient.smsDeliveryStatus} smsOptIn={patient.smsOptIn} isDemo={patient.isDemo} errorCode={patient.smsLastErrorCode} updatedAt={patient.smsStatusUpdatedAt} /></div><Button variant="outline" size="sm" disabled={busy} onClick={() => rejoin.mutate({ id: patient.id })} className="h-8 shrink-0 rounded-lg border-[#eadbca] px-2.5 text-[10px] text-[#8a6849] hover:bg-[#fff7ea]"><RotateCcw className="size-3" /> Rejoin</Button></div>)}</div><p className="mt-3 text-[10px] leading-4 text-[#a19182]">Rejoining moves a patient to the back of the line.</p></section> : null}

              {data.data ? <section className="overflow-hidden rounded-[22px] bg-[#e9f1e9] p-5 sm:p-6"><div className="flex items-start justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#819a88]">Hackathon demo</p><h2 className="mt-2 text-[18px] font-bold tracking-[-.035em] text-[#3c5c4c]">Queue + analytics sample data</h2></div><div className="grid size-9 place-items-center rounded-xl bg-white/75 text-[#78a080]"><Users className="size-4" /></div></div><p className="mt-2 text-[11px] leading-5 text-[#748b7b]">Adds 25 tagged mock records (12 active, 12 completed, one no-show) and fills the charts. Existing live tickets stay untouched. Mock patients have no phone number or SMS consent; sample SMS badges are clearly marked DEMO.</p><div className="mt-4 flex gap-2"><Button disabled={seedDemo.isPending || data.data.demoTicketCount > 0} onClick={() => seedDemo.mutate()} className="h-10 flex-1 rounded-xl bg-[#527d65] text-xs font-bold text-white hover:bg-[#456e58]">{seedDemo.isPending ? "Adding…" : data.data.demoTicketCount > 0 ? `${data.data.demoTicketCount} demo records loaded` : <>Load demo patients <ArrowRight className="size-3.5" /></>}</Button>{data.data.demoTicketCount > 0 ? <Button variant="outline" disabled={clearDemo.isPending} onClick={() => { if (window.confirm(`Remove only the ${data.data?.demoTicketCount ?? 0} tagged demo records? Live patient tickets will not be touched.`)) clearDemo.mutate(); }} className="h-10 rounded-xl border-[#b7cbbc] bg-white/75 px-3 text-[10px] font-bold text-[#557461]">{clearDemo.isPending ? "Clearing…" : "Clear demo"}</Button> : null}</div></section> : null}

              <section className="rounded-[22px] border border-[#e4ebe5] bg-white p-5 sm:p-6"><div className="flex items-center gap-2"><div className="grid size-8 place-items-center rounded-xl bg-[#edf5f0] text-[#4e8f77]"><Volume2 className="size-4" /></div><p className="text-[12px] font-bold text-[#486258]">Built for the room</p></div><p className="mt-3 text-[11px] leading-5 text-[#84928b]">Open the display on a shared screen. It shows token numbers only, and can speak new calls aloud in the browser.</p><Link href="/display" className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#38816c]">Launch queue display <ArrowRight className="size-3" /></Link></section>
            </aside>
          </div>

          <footer className="mt-7 flex items-center justify-between border-t border-[#e2e9e3] pt-4 text-[10px] text-[#94a199]"><span>CareQueue · Staff view is sign-in protected</span><span>Live refresh · every 3.5 sec</span></footer>
        </div>
      </main>
    </DashboardLayout>
  );
}

export default function Staff() {
  return <StaffContent />;
}


function ConsultationTrendChart({ points, average }: { points: ConsultationTrendPoint[]; average: number }) {
  const width = 360;
  const height = 126;
  const left = 28;
  const right = 8;
  const top = 10;
  const bottom = 102;
  const maxMinutes = Math.max(15, average, ...points.map(point => point.durationMinutes)) + 1;
  const xFor = (index: number) => points.length < 2 ? (left + width - right) / 2 : left + (index / (points.length - 1)) * (width - left - right);
  const yFor = (minutes: number) => bottom - (minutes / maxMinutes) * (bottom - top);
  const coordinates = points.map((point, index) => `${xFor(index)},${yFor(point.durationMinutes)}`).join(" ");
  const ticks = [0, Math.round(maxMinutes / 2), Math.round(maxMinutes)];
  const timeLabel = (timestamp: number) => new Date(timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div className="mt-5 border-t border-[#edf1ee] pt-4">
      <div className="flex items-center justify-between gap-2"><div><p className="text-[11px] font-bold text-[#61766b]">Consultation time trend</p><p className="mt-0.5 text-[9px] text-[#95a198]">Most recent completed visits · minutes each</p></div><span className="flex items-center gap-1.5 text-[9px] text-[#8a9990]"><i className="h-px w-4 border-t border-dashed border-[#b9a36e]" /> average {average}m</span></div>
      {points.length ? <>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Consult duration trend for ${points.length} recent visits. Recent average is ${average} minutes.`} className="mt-2 h-[130px] w-full overflow-visible">
          {ticks.map(tick => <g key={tick}><line x1={left} x2={width - right} y1={yFor(tick)} y2={yFor(tick)} stroke="#edf1ed" strokeWidth="1" /><text x="2" y={yFor(tick) + 3} fill="#9aa69e" fontSize="8">{tick}m</text></g>)}
          <line x1={left} x2={width - right} y1={yFor(average)} y2={yFor(average)} stroke="#b9a36e" strokeDasharray="4 4" strokeWidth="1.5" />
          <polyline points={coordinates} fill="none" stroke="#549578" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => <circle key={`${point.token}-${point.completedAt}`} cx={xFor(index)} cy={yFor(point.durationMinutes)} r="3.5" fill="#fff" stroke="#43866c" strokeWidth="2"><title>{`${point.token}: ${point.durationMinutes} min · ${timeLabel(point.completedAt)}`}</title></circle>)}
        </svg>
        <div className="flex justify-between px-7 text-[9px] text-[#97a39b]"><span>{timeLabel(points[0]!.completedAt)}</span><span>{timeLabel(points[points.length - 1]!.completedAt)}</span></div>
      </> : <p className="mt-3 rounded-xl bg-[#f7f9f6] px-3 py-4 text-[10px] leading-4 text-[#8a9991]">Completed visit durations will appear here as staff close consultations.</p>}
    </div>
  );
}
