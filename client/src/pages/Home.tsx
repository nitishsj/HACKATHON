import { StatusPill } from "@/components/queue/StatusPill";
import { TextShimmer } from "@/components/21st/TextShimmer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { patientCopy, languageOptions, voiceLocales, type PatientLanguage } from "@shared/patientI18n";
import { getEtaCountdownSeconds, normalizePatientPhone } from "@shared/queueLogic";
import { Activity, ArrowDownRight, ArrowRight, Bell, Clock3, HeartPulse, MonitorPlay, ShieldCheck, Sparkles, Stethoscope, Ticket, Volume2, VolumeX } from "lucide-react";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";

const STORAGE_KEY = "carequeue-ticket";
const LANGUAGE_STORAGE_KEY = "carequeue.patient-language";
const liveCountdownLabel: Record<PatientLanguage, string> = {
  en: "live",
  hi: "लाइव",
  ta: "நேரலை",
  te: "ప్రత్యక్షం",
};
const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
type SavedTicket = { id: number; token: string; accessKey: string };
const EMPTY_INPUT = { id: 1, accessKey: "00000000-0000-0000-0000-000000000000" };

function loadSavedTicket(): SavedTicket | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as SavedTicket | null;
    if (saved && Number.isInteger(saved.id) && saved.id > 0 && typeof saved.accessKey === "string") return saved;
  } catch { /* Ignore a malformed browser cache and let the patient check in again. */ }
  return null;
}

function loadLanguage(): PatientLanguage {
  try {
    const value = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (value === "en" || value === "hi" || value === "ta" || value === "te") return value;
  } catch { /* Use English when browser storage is unavailable. */ }
  return "en";
}

function formatCountdown(seconds: number, language: PatientLanguage) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const remainingSeconds = safeSeconds % 60;
  const digits = new Intl.NumberFormat(voiceLocales[language], { minimumIntegerDigits: 2, useGrouping: false });
  if (hours > 0) return `${hours}:${digits.format(minutes)}:${digits.format(remainingSeconds)}`;
  return `${digits.format(minutes)}:${digits.format(remainingSeconds)}`;
}

export default function Home() {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [language, setLanguage] = useState<PatientLanguage>(loadLanguage);
  const [saved, setSaved] = useState<SavedTicket | null>(loadSavedTicket);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [clientClock, setClientClock] = useState(() => Date.now());
  const announcedStatus = useRef<string | null>(null);
  const utils = trpc.useUtils();
  const copy = patientCopy[language];
  const board = trpc.queue.board.useQuery(undefined, { refetchInterval: 4000, staleTime: 1500, retry: 1 });
  const ticketInput = useMemo(() => saved ? { id: saved.id, accessKey: saved.accessKey } : EMPTY_INPUT, [saved]);
  const ticket = trpc.queue.myTicket.useQuery(ticketInput, { enabled: Boolean(saved), refetchInterval: 4000, retry: false });
  const countdownSeconds = ticket.data
    ? getEtaCountdownSeconds(ticket.data.etaMinutes, ticket.data.serverNow, clientClock)
    : 0;
  const countdownText = ticket.data?.status === "waiting"
    ? formatCountdown(countdownSeconds, language)
    : ticket.data?.status === "called" ? copy.anyMoment : "—";

  const join = trpc.queue.join.useMutation({
    onSuccess: result => {
      const next = { id: result.id, token: result.token, accessKey: result.accessKey };
      setSaved(next);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Queue token remains visible for this session. */ }
      setName("");
      setPhoneNumber("");
      setSmsOptIn(false);
      void utils.queue.board.invalidate();
    },
  });

  useEffect(() => {
    try { localStorage.setItem(LANGUAGE_STORAGE_KEY, language); } catch { /* Language selection remains active for this visit. */ }
  }, [language]);

  useEffect(() => {
    const timer = window.setInterval(() => setClientClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const status = ticket.data?.status;
    if (status === "called" && announcedStatus.current !== "called" && voiceEnabled && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const announcement = new SpeechSynthesisUtterance(copy.voiceAnnouncement(ticket.data?.token ?? ""));
      announcement.lang = voiceLocales[language];
      window.speechSynthesis.speak(announcement);
    }
    announcedStatus.current = status ?? null;
  }, [ticket.data?.status, ticket.data?.token, voiceEnabled, language, copy]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanName = name.trim();
    const phone = normalizePatientPhone(phoneNumber);
    if (cleanName.length < 2) return;
    const requestSms = smsOptIn && E164_PHONE_PATTERN.test(phone);
    join.mutate({
      name: cleanName,
      preferredLanguage: language,
      smsOptIn: requestSms,
      ...(requestSms ? { phoneNumber: phone } : {}),
    });
  };

  const forgetCompletedTicket = () => {
    try { localStorage.removeItem(STORAGE_KEY); } catch { /* Ignore storage restrictions. */ }
    setSaved(null);
    announcedStatus.current = null;
  };

  const waitingCount = board.data?.waitingCount;
  const normalizedPhone = normalizePatientPhone(phoneNumber);
  const validSmsPhone = E164_PHONE_PATTERN.test(normalizedPhone);
  const canSubmit = name.trim().length >= 2;

  return (
    <div className="min-h-screen overflow-hidden bg-[#f6f8f5]">
      <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-3 px-5 py-5 sm:px-8 lg:px-12">
        <Link href="/" className="group flex shrink-0 items-center gap-3" aria-label="CareQueue home">
          <span className="grid size-10 place-items-center rounded-[15px] bg-[#13786e] text-white shadow-[0_8px_20px_rgba(20,125,115,.18)] transition-transform group-hover:-rotate-3">
            <HeartPulse className="size-5" strokeWidth={2.1} />
          </span>
          <span className="text-[18px] font-bold tracking-[-.04em] text-[#193b37]">CareQueue</span>
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <label className="sr-only" htmlFor="patient-language">{copy.language}</label>
          <select id="patient-language" value={language} onChange={event => setLanguage(event.target.value as PatientLanguage)} aria-label={copy.language} className="h-10 rounded-full border border-[#dfe8e2] bg-white px-3 text-xs font-semibold text-[#355d55] shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-[#84b8a5]">
            {languageOptions.map(option => <option key={option.code} value={option.code}>{option.label}</option>)}
          </select>
          <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
            <Link href="/" className="hidden rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#2c5d56] shadow-sm sm:inline-flex">{copy.navPatient}</Link>
            <Link href="/staff" className="hidden rounded-full px-3 py-2 text-sm font-medium text-[#697a75] transition hover:bg-white hover:text-[#204741] md:inline-flex sm:px-4">{copy.navStaff}</Link>
            <Link href="/display" className="hidden items-center gap-2 rounded-full border border-[#dfe8e2] bg-white/75 px-4 py-2 text-sm font-medium text-[#355d55] transition hover:border-[#b8d7cc] hover:bg-white lg:inline-flex"><MonitorPlay className="size-4" /> {copy.navDisplay}</Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 pb-12 pt-4 sm:px-8 sm:pt-9 lg:px-12">
        <div className="grid items-center gap-12 lg:grid-cols-[1.06fr_.94fr] lg:gap-16">
          <section className="animate-rise relative z-10 max-w-[620px]">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-[#dbe8e1] bg-white/75 px-3.5 py-2 text-xs font-semibold tracking-[.02em] text-[#47736a] shadow-[0_2px_10px_rgba(28,74,63,.035)]">
              <span className="relative flex size-2"><span className="live-dot absolute inline-flex size-full rounded-full bg-[#54a68e] opacity-70" /><span className="relative inline-flex size-2 rounded-full bg-[#328b73]" /></span>
              <TextShimmer as="span" duration={3}>{copy.liveQueue}</TextShimmer>
              <span className="mx-0.5 h-3 w-px bg-[#d9e3dd]" />
              {waitingCount !== undefined ? copy.waiting(waitingCount) : "…"}
            </div>
            <p className="mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.19em] text-[#739087]"><Stethoscope className="size-4" /> {copy.tagline}</p>
            <h1 className="max-w-[600px] font-[Fraunces,Georgia,serif] text-[44px] leading-[1.06] tracking-[-.045em] text-[#183c36] sm:text-[58px] lg:text-[66px]">
              {copy.titleLead} <span className="text-[#4b9a88]">{copy.titleAccent}</span>
            </h1>
            <p className="mt-6 max-w-[520px] text-[16px] leading-7 text-[#657b73] sm:text-[18px] sm:leading-8">{copy.intro}</p>

            <div className="mt-9 grid max-w-[540px] grid-cols-3 gap-3 sm:gap-5">
              <div className="flex items-start gap-2.5"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-[#e5f2ec] text-[#2f8a73]"><Clock3 className="size-4" /></span><span className="text-xs leading-5 text-[#64776f] sm:text-[13px]">{copy.benefitWait}</span></div>
              <div className="flex items-start gap-2.5"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-[#e5f2ec] text-[#2f8a73]"><Bell className="size-4" /></span><span className="text-xs leading-5 text-[#64776f] sm:text-[13px]">{copy.benefitVoice}</span></div>
              <div className="flex items-start gap-2.5"><span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-[#e5f2ec] text-[#2f8a73]"><ShieldCheck className="size-4" /></span><span className="text-xs leading-5 text-[#64776f] sm:text-[13px]">{copy.benefitPrivacy}</span></div>
            </div>

            <div className="mt-11 flex items-center gap-3 border-t border-[#e3ebe5] pt-5 text-[12px] text-[#71837c]">
              <div className="flex -space-x-2" aria-hidden="true"><span className="grid size-7 place-items-center rounded-full border-2 border-[#f6f8f5] bg-[#d8e9e0] text-[9px] font-bold text-[#446e5f]">A</span><span className="grid size-7 place-items-center rounded-full border-2 border-[#f6f8f5] bg-[#f0dfd0] text-[9px] font-bold text-[#936c4f]">M</span><span className="grid size-7 place-items-center rounded-full border-2 border-[#f6f8f5] bg-[#dbe5f2] text-[9px] font-bold text-[#58718f]">R</span></div>
              <span>{copy.restTagline}</span><ArrowDownRight className="ml-auto hidden size-4 text-[#6e998a] sm:block" />
            </div>
          </section>

          <section className="animate-rise relative mx-auto w-full max-w-[505px] lg:ml-auto" style={{ animationDelay: "90ms" }}>
            <div className="absolute -right-10 -top-12 -z-10 size-48 rounded-full bg-[#dceddf]/75 blur-[50px]" />
            <div className="absolute -bottom-10 -left-8 -z-10 size-44 rounded-full bg-[#e6e9d7]/70 blur-[54px]" />
            <div className="overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_25px_80px_rgba(28,70,58,.11)]">
              <div className="flex items-center justify-between border-b border-[#eef2ef] px-6 py-5 sm:px-8">
                <div><p className="text-[11px] font-bold uppercase tracking-[.16em] text-[#83a097]">{copy.clinicName}</p><h2 className="mt-1.5 text-[21px] font-bold tracking-[-.035em] text-[#203b36]">{saved ? copy.savedTitle : copy.joinTitle}</h2></div>
                <div className="grid size-11 place-items-center rounded-2xl bg-[#edf6f1] text-[#2f8d78]"><Ticket className="size-5" /></div>
              </div>

              <div className="px-6 pb-7 pt-6 sm:px-8 sm:pb-8">
                {saved && ticket.data ? (
                  <div className="animate-rise">
                    <div className="flex items-center justify-between rounded-2xl bg-[#f4f8f5] px-4 py-4">
                      <div><p className="text-xs font-medium text-[#71827b]">{copy.tokenLabel}</p><p className="mt-1 text-[26px] font-bold tracking-[-.04em] text-[#1e5249]">{ticket.data.token}</p></div>
                      <StatusPill status={ticket.data.status} language={language} />
                    </div>
                    <div className="mt-5 flex items-end justify-between border-b border-[#edf1ed] pb-5">
                      <div><p className="text-[12px] text-[#7a8a83]">{copy.estimate} · {ticket.data.status === "waiting" ? liveCountdownLabel[language] : ""}</p><p role="timer" aria-live="off" aria-label={`${copy.estimate}: ${countdownText}`} className="mt-1 font-[Fraunces,Georgia,serif] text-[38px] leading-none tracking-[-.04em] tabular-nums text-[#1b4f45]">{countdownText}</p></div>
                      <div className="mb-1 text-right text-[12px] text-[#778981]">{ticket.data.patientsAhead}<br />{copy.ahead}</div>
                    </div>
                    <div className="mt-5 rounded-2xl border border-[#e9f0eb] bg-white px-4 py-4">
                      <div className="flex items-center gap-2 text-[13px] font-semibold text-[#405e55]"><Activity className="size-4 text-[#4a9b83]" /> {copy.statusTitle}</div>
                      <p className="mt-2 text-[12px] leading-5 text-[#788880]">
                        {ticket.data.status === "called" ? copy.calledStatus : ticket.data.status === "in_consultation" ? copy.consultationStatus : ticket.data.status === "completed" ? copy.completedStatus : ticket.data.status === "no_show" ? copy.noShowStatus : copy.waitingStatus(ticket.data.averageConsultMinutes)}
                      </p>
                    </div>
                    {ticket.data.smsDeliveryStatus !== "none" ? <div aria-live="polite" className={`mt-4 rounded-xl px-4 py-3 text-[11px] ${["failed", "undelivered", "canceled"].includes(ticket.data.smsDeliveryStatus) ? "bg-[#fff3f1] text-[#8d5148]" : ticket.data.smsDeliveryStatus === "delivered" || ticket.data.smsDeliveryStatus === "read" ? "bg-[#edf7f0] text-[#3f745b]" : "bg-[#fff8e9] text-[#806633]"}`}><span className="font-bold">{copy.smsStatusLabel}: </span>{["failed", "undelivered", "canceled"].includes(ticket.data.smsDeliveryStatus) ? copy.smsStatusFailed : ticket.data.smsDeliveryStatus === "delivered" || ticket.data.smsDeliveryStatus === "read" ? copy.smsStatusDelivered : copy.smsStatusQueued}</div> : null}
                    {ticket.data.status !== "completed" && ticket.data.status !== "no_show" ? (
                      <button type="button" onClick={() => setVoiceEnabled(value => !value)} className={`mt-4 flex w-full items-center justify-between rounded-xl px-4 py-3 text-left transition ${voiceEnabled ? "bg-[#eaf5f0] text-[#286e5d]" : "bg-[#f6f8f6] text-[#6e7e76] hover:bg-[#eff4f0]"}`}>
                        <span className="flex items-center gap-2.5 text-[12px] font-semibold">{voiceEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}{voiceEnabled ? copy.voiceOn : copy.voiceOff}</span><span className="text-[10px]">{copy.pageOpen}</span>
                      </button>
                    ) : null}
                    {ticket.data.status === "completed" || ticket.data.status === "no_show" ? <Button type="button" onClick={forgetCompletedTicket} className="mt-5 h-12 w-full rounded-xl bg-[#147d73] font-semibold text-white shadow-[0_8px_20px_rgba(20,125,115,.16)] hover:bg-[#116c64]">{copy.checkInAgain} <ArrowRight className="size-4" /></Button> : null}
                    {ticket.isError ? <p role="alert" className="mt-3 text-xs text-rose-700">{copy.reloadError}</p> : null}
                    <p className="mt-4 text-center text-[10px] leading-4 text-[#98a69f]">{copy.voiceDisclaimer}</p>
                  </div>
                ) : saved && ticket.isLoading ? (
                  <div className="grid min-h-[220px] place-items-center text-sm text-[#7b8d84]"><div className="text-center"><div className="mx-auto mb-3 size-7 animate-spin rounded-full border-2 border-[#dbeae2] border-t-[#378d79]" />{copy.findingToken}</div></div>
                ) : saved && ticket.isError ? (
                  <div className="rounded-2xl border border-[#f0ddd8] bg-[#fff8f6] p-5 text-sm text-[#815b53]">
                    <p className="font-semibold">{copy.tokenError}</p><p className="mt-1 leading-5">{copy.tokenErrorHelp}</p>
                    <button type="button" onClick={forgetCompletedTicket} className="mt-4 text-xs font-bold text-[#9a5347] underline underline-offset-4">{copy.clearToken}</button>
                  </div>
                ) : (
                  <>
                    <p className="mb-5 text-[13px] leading-6 text-[#75847c]">{copy.formIntro}</p>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div><label htmlFor="patient-name" className="mb-2 block text-[12px] font-bold text-[#40564e]">{copy.patientName}</label><Input id="patient-name" value={name} onChange={event => setName(event.target.value)} placeholder={copy.namePlaceholder} autoComplete="name" maxLength={80} className="h-[50px] rounded-xl border-[#dfe9e2] bg-[#fbfcfb] px-4 text-sm placeholder:text-[#a3b1a9] focus-visible:ring-[#84b8a5]" /></div>
                      {board.data?.smsReady ? (
                        <div className="space-y-3 rounded-2xl border border-[#e8efea] bg-[#fbfcfb] p-4">
                          <div><label htmlFor="patient-phone" className="mb-2 block text-[12px] font-bold text-[#40564e]">{copy.phoneLabel}</label><Input id="patient-phone" type="tel" inputMode="tel" value={phoneNumber} onChange={event => setPhoneNumber(event.target.value)} placeholder={copy.phonePlaceholder} autoComplete="tel" maxLength={20} aria-describedby="patient-phone-hint" className="h-11 rounded-xl border-[#dfe9e2] bg-white px-3 text-sm placeholder:text-[#a3b1a9] focus-visible:ring-[#84b8a5]" /><p id="patient-phone-hint" className="mt-1.5 text-[10px] text-[#88968f]">{copy.phoneHint}</p></div>
                          {smsOptIn && !validSmsPhone ? <p role="status" className="rounded-lg bg-[#fff7e8] px-3 py-2 text-[10px] leading-4 text-[#806633]">{copy.smsInvalidPhone}</p> : null}
                          <label htmlFor="sms-opt-in" className="flex cursor-pointer items-start gap-2.5 text-[11px] leading-5 text-[#5f766c]"><input id="sms-opt-in" type="checkbox" checked={smsOptIn} onChange={event => setSmsOptIn(event.target.checked)} className="mt-1 size-4 shrink-0 accent-[#147d73]" /><span>{copy.smsConsent}<span id="sms-terms" className="mt-1 block text-[10px] text-[#89988f]">{copy.smsRates}</span></span></label>
                        </div>
                      ) : board.data ? <p className="rounded-xl bg-[#f7f8f4] px-3 py-2 text-[11px] leading-5 text-[#7a8a80]">{copy.smsUnavailable}</p> : null}
                      {join.error ? <p role="alert" className="-mt-2 text-xs text-rose-700">{join.error.message}</p> : null}
                      <Button type="submit" disabled={join.isPending || !canSubmit} className="h-[52px] w-full rounded-xl bg-[#147d73] text-sm font-bold text-white shadow-[0_8px_20px_rgba(20,125,115,.17)] hover:bg-[#116d65]">
                        {join.isPending ? <><span className="size-4 animate-spin rounded-full border-2 border-white/50 border-t-white" /> {copy.submitting}</> : <>{copy.submit} <ArrowRight className="size-4" /></>}
                      </Button>
                    </form>
                    <div className="mt-5 flex items-start gap-2.5 border-t border-[#eef2ef] pt-4 text-[11px] leading-5 text-[#88968f]"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-[#4d9b84]" /><span>{copy.namePrivacy}</span></div>
                  </>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-[#eff3f0] bg-[#fbfcfb] px-6 py-3.5 text-[10px] text-[#8d9a93] sm:px-8"><span>{copy.livePrivate}</span><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#4da386]" />{copy.updateFrequency}</span></div>
            </div>
            <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-[#8a9891]"><Sparkles className="size-3.5 text-[#75a590]" /> {copy.restTagline}</div>
          </section>
        </div>

        <section className="mt-16 grid gap-4 border-t border-[#e2e9e3] pt-8 sm:grid-cols-3" aria-label="How it works">
          <div className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[#5a8a79] shadow-sm">01</span><div><p className="text-[13px] font-bold text-[#36554c]">{copy.step1}</p><p className="mt-1 text-xs leading-5 text-[#84938b]">{copy.step1Help}</p></div></div>
          <div className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[#5a8a79] shadow-sm">02</span><div><p className="text-[13px] font-bold text-[#36554c]">{copy.step2}</p><p className="mt-1 text-xs leading-5 text-[#84938b]">{copy.step2Help}</p></div></div>
          <div className="flex gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-bold text-[#5a8a79] shadow-sm">03</span><div><p className="text-[13px] font-bold text-[#36554c]">{copy.step3}</p><p className="mt-1 text-xs leading-5 text-[#84938b]">{copy.step3Help}</p></div></div>
        </section>
        <footer className="mt-12 flex flex-col gap-3 border-t border-[#e2e9e3] pt-5 text-[11px] text-[#91a098] sm:flex-row sm:items-center sm:justify-between">
          <span>{copy.footer}</span>
          <div className="flex items-center gap-4"><Link href="/staff" className="hover:text-[#3d7567]">{copy.navStaff}</Link><Link href="/display" className="inline-flex items-center gap-1 hover:text-[#3d7567]">{copy.navDisplay} <MonitorPlay className="size-3" /></Link></div>
        </footer>
      </main>
    </div>
  );
}
