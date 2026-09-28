import { TextShimmer } from "@/components/21st/TextShimmer";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { Activity, ArrowRight, Clock3, HeartPulse, MonitorPlay, Volume2, VolumeX } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";

function clockNow() {
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(new Date());
}

function etaLabel(minutes: number) {
  if (minutes <= 0) return "Soon";
  return `~${minutes} min`;
}

export default function Display() {
  const board = trpc.queue.board.useQuery(undefined, { refetchInterval: 3500, staleTime: 1200, retry: 1 });
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [time, setTime] = useState(clockNow);
  const announcedToken = useRef<number | null>(null);
  const date = useMemo(() => new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" }).format(new Date()), []);

  useEffect(() => {
    const timer = window.setInterval(() => setTime(clockNow()), 20_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const current = board.data?.current;
    if (voiceEnabled && current?.status === "called" && announcedToken.current !== current.id && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const announcement = new SpeechSynthesisUtterance(`Queue ${current.token.replace("-", " ")}, please come to the reception desk.`);
      announcement.lang = "en-IN";
      window.speechSynthesis.speak(announcement);
      announcedToken.current = current.id;
    }
  }, [board.data?.current?.id, board.data?.current?.status, board.data?.current?.token, voiceEnabled]);

  const current = board.data?.current;
  const waiting = (board.data?.tickets ?? []).filter(ticket => ticket.status === "waiting");

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#14282a] text-white selection:bg-[#255d55]">
      <div className="pointer-events-none absolute -right-40 -top-56 size-[620px] rounded-full bg-[#226961]/20 blur-[110px]" />
      <div className="pointer-events-none absolute -bottom-72 -left-44 size-[600px] rounded-full bg-[#83865f]/10 blur-[120px]" />

      <header className="relative z-10 flex items-center justify-between border-b border-white/[.09] px-6 py-5 sm:px-10 lg:px-14">
        <Link href="/" className="flex items-center gap-3" aria-label="CareQueue home">
          <span className="grid size-10 place-items-center rounded-[15px] bg-[#b4ddc5] text-[#183d35]"><HeartPulse className="size-5" /></span>
          <span><span className="block text-[17px] font-bold tracking-[-.04em]">CareQueue</span><span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[.19em] text-[#9ab7ad]">Goodwell Community Clinic</span></span>
        </Link>
        <div className="hidden items-center gap-8 sm:flex">
          <div className="text-right"><p className="text-xs font-medium text-[#a9c1b7]">{date}</p><p className="mt-1 text-[21px] font-semibold tracking-[-.03em]">{time}</p></div>
          <div className="h-8 w-px bg-white/10" />
          <div className="flex items-center gap-2 text-xs text-[#a4bcb1]"><span className="relative flex size-2"><span className="absolute inline-flex size-full animate-ping rounded-full bg-[#87d0ac] opacity-50" /><span className="relative inline-flex size-2 rounded-full bg-[#87d0ac]" /></span>Live queue</div>
        </div>
        <Button onClick={() => setVoiceEnabled(value => !value)} variant="outline" className={`h-10 rounded-xl border-white/15 px-3 text-[11px] ${voiceEnabled ? "bg-[#244c43] text-[#cbecd8] hover:bg-[#2b5a50]" : "bg-white/[.04] text-[#c0d0c8] hover:bg-white/[.08]"}`} aria-label={voiceEnabled ? "Turn off voice announcements" : "Turn on voice announcements"}>
          {voiceEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}<span className="hidden sm:inline">{voiceEnabled ? "Voice on" : "Enable voice"}</span>
        </Button>
      </header>

      <div className="relative z-10 flex flex-1 flex-col px-5 pb-6 pt-8 sm:px-10 sm:pt-10 lg:px-14">
        <div className="mx-auto flex w-full max-w-[1420px] flex-1 flex-col">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.18em] text-[#94b5a7]"><MonitorPlay className="size-4" /><TextShimmer as="span" duration={3}>Waiting room display</TextShimmer></div>
          <div className="mt-3 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
            <div><h1 className="font-[Fraunces,Georgia,serif] text-[34px] leading-tight tracking-[-.045em] text-[#f2f6ed] sm:text-[45px]">A little more room to breathe.</h1><p className="mt-2 max-w-xl text-[13px] leading-6 text-[#a5bab0] sm:text-[14px]">Watch your token here. Patient names are never shown on this screen.</p></div>
            <div className="mb-1 flex items-center gap-2 text-[11px] text-[#a5bbb0]"><Clock3 className="size-3.5 text-[#94c3aa]" /> ETA learns from the day’s visit times</div>
          </div>

          <div className="mt-7 grid flex-1 gap-4 lg:grid-cols-[1.18fr_.82fr]">
            <section className="relative flex min-h-[360px] flex-col justify-between overflow-hidden rounded-[28px] border border-white/[.08] bg-[#1c3736] p-6 sm:p-9 lg:min-h-[470px] lg:p-12">
              <div className="pointer-events-none absolute -right-10 -top-24 size-[360px] rounded-full border border-[#a3d9bc]/[.07]" />
              <div className="pointer-events-none absolute -right-1 -top-16 size-[280px] rounded-full border border-[#a3d9bc]/[.07]" />
              <div className="relative flex items-start justify-between gap-4">
                <div><p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#a1c8b4]">{current?.status === "called" ? "Now calling" : current?.status === "in_consultation" ? "With the clinician" : "Now serving"}</p><p className="mt-2 text-[12px] text-[#b0c5b8]">Please listen for your token number</p></div>
                <span className="flex items-center gap-2 rounded-full border border-[#c2e6d2]/15 bg-[#b3dfc4]/[.07] px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.15em] text-[#bdddc8]"><span className="size-1.5 rounded-full bg-[#9bdbb5]" />Goodwell · Room 1</span>
              </div>
              <div className="relative my-7">
                {current ? <>
                  <p className="text-[12px] font-bold uppercase tracking-[.24em] text-[#9db8a9]">Token number</p>
                  <p className="mt-2 font-[Fraunces,Georgia,serif] text-[74px] leading-[.94] tracking-[-.065em] text-[#f5f6e9] sm:text-[105px] lg:text-[124px]">{current.token}</p>
                  <p className="mt-5 flex items-center gap-2 text-[12px] text-[#c0d1c6] sm:text-[14px]">{current.status === "called" ? <><Activity className="size-4 text-[#a6d8ba]" /> Please proceed to the reception desk</> : <><span className="size-1.5 rounded-full bg-[#96ceae]" />Currently in consultation</>}</p>
                </> : <>
                  <p className="text-[12px] font-bold uppercase tracking-[.24em] text-[#9db8a9]">No one is being called</p>
                  <p className="mt-2 font-[Fraunces,Georgia,serif] text-[64px] leading-[.98] tracking-[-.055em] text-[#f5f6e9] sm:text-[82px]">Take a<br />breath.</p>
                  <p className="mt-5 text-[13px] text-[#c0d1c6]">The clinic team is ready for the next patient.</p>
                </>}
              </div>
              <div className="relative flex items-center justify-between border-t border-white/[.1] pt-5 text-[10px] text-[#a0b7aa]"><span className="flex items-center gap-2"><Activity className="size-3.5 text-[#84b79b]" />Queue updates live</span><span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-[#83c59e]" />{board.data?.waitingCount ?? "—"} waiting</span></div>
            </section>

            <section className="flex min-h-[360px] flex-col overflow-hidden rounded-[28px] border border-white/[.08] bg-[#f5f6ee] text-[#253d35] lg:min-h-[470px]">
              <div className="flex items-center justify-between border-b border-[#e3e9de] px-5 py-5 sm:px-7">
                <div><p className="text-[10px] font-bold uppercase tracking-[.17em] text-[#84988c]">On deck</p><h2 className="mt-1 text-[19px] font-bold tracking-[-.04em] text-[#28443a]">Coming up next</h2></div>
                <div className="grid size-10 place-items-center rounded-[14px] bg-[#e7efe4] text-[#5e8f75]"><Activity className="size-4" /></div>
              </div>
              <div className="flex-1 px-4 py-2 sm:px-6">
                {board.isLoading ? <div className="grid min-h-[230px] place-items-center text-xs text-[#83948a]"><span className="flex items-center gap-2"><span className="size-4 animate-spin rounded-full border-2 border-[#dce7dc] border-t-[#5b987c]" />Loading live queue…</span></div> : null}
                {!board.isLoading && waiting.length === 0 ? <div className="grid min-h-[240px] place-items-center px-4 text-center"><div><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-[#e7efe4] text-[#68967b]"><HeartPulse className="size-5" /></span><p className="mt-4 text-[13px] font-bold text-[#3d5b4d]">A little quiet moment.</p><p className="mt-1 max-w-[230px] text-[11px] leading-5 text-[#87968c]">New queue tokens will appear here as soon as someone checks in.</p><Link href="/" className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#4c896e]">Join the queue <ArrowRight className="size-3.5" /></Link></div></div> : null}
                <div className="divide-y divide-[#e8ede6]">
                  {waiting.slice(0, 6).map((patient, index) => (
                    <div key={patient.id} className="flex items-center justify-between gap-3 py-[14px]">
                      <div className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white text-[10px] font-bold text-[#84a28f] shadow-[0_2px_6px_rgba(41,74,52,.04)]">{String(index + 1).padStart(2, "0")}</span><div><p className="text-[10px] font-bold uppercase tracking-[.11em] text-[#92a197]">Queue token</p><p className="mt-0.5 text-[15px] font-bold tracking-[-.02em] text-[#2c5143]">{patient.token}</p></div></div>
                      <span className="rounded-full bg-[#e7efe6] px-2.5 py-1.5 text-[10px] font-semibold text-[#668370]">{etaLabel(patient.etaMinutes)}</span>
                    </div>
                  ))}
                </div>
                {waiting.length > 6 ? <p className="pb-3 pt-1 text-center text-[10px] text-[#8b9a8e]">+ {waiting.length - 6} more in line</p> : null}
              </div>
              <div className="border-t border-[#e3e9de] bg-[#edf1e8] px-5 py-3 text-[10px] leading-5 text-[#849287] sm:px-7">Your estimated wait may change as appointments progress.</div>
            </section>
          </div>

          <div className="mt-5 flex flex-col justify-between gap-2 rounded-2xl border border-white/[.08] bg-white/[.035] px-5 py-4 text-[10px] text-[#a1b6a9] sm:flex-row sm:items-center sm:px-6">
            <span className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-[#95cfaa]" />Please keep your token ready. Thank you for giving others room to rest.</span>
            <span className="flex items-center gap-3"><Link href="/" className="hover:text-white">Patient check-in</Link><span className="h-3 w-px bg-white/15" /><Link href="/staff" className="hover:text-white">Staff console</Link></span>
          </div>
          {board.isError ? <p role="alert" className="mt-3 text-xs text-rose-200">Live connection interrupted. The screen will retry automatically.</p> : null}
        </div>
      </div>
    </main>
  );
}
