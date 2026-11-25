"use client";

import { useMemo, useState } from "react";
import {
  Video, BookOpenCheck, Flame, CheckCircle2, Circle, CalendarCheck2,
  GraduationCap, Wallet, StickyNote, Pin, Radio, Quote, Clock3, Check, X,
} from "lucide-react";
import { useLiveData, toast, Skeleton, LiveBadge } from "@/components/live";
import { SectionTitle, Avatar, ProgressBar, EmptyState, FeeChip } from "@/components/kit";
import { toBn, moneyBn, timeAgo, todayLocal, bnDateShort } from "@/lib/format";

type Bundle = {
  profile: {
    id: number; code: string; name: string; nameBn: string; phone: string; avatarColor: string;
    guardian: string; guardianPhone: string; joinedAt: string;
    batchBn: string; batchSubject: string; schedule: string; room: string;
    teacher: { nameBn: string; subject: string; phone: string; avatarColor: string } | null;
  };
  stats: { present: number; late: number; absent: number; total: number; rate: number | null; completedClasses: number; allSessions: number; monthSessions: number };
  fee: { month: string; monthLabel: string; amount: number; paid: number; due: number; status: "paid" | "partial" | "due"; prev: { month: string; due: number } | null };
  latestMeet: { id: number; kind: string; meetUrl: string; message: string; pinned: boolean; teacherBn: string; createdAt: string } | null;
  feed: Array<{ id: number; kind: string; meetUrl: string; message: string; pinned: boolean; teacherBn: string; createdAt: string }>;
  calendar: Array<{ date: string; day: number; status: "present" | "late" | "absent" | null }>;
};

type StudyState = {
  today: string; total: number; doneToday: number; pct: number;
  streak: number; bestStreak: number; lifetimeChecks: number; message: string;
  goals: Array<{ id: number; title: string; checked: boolean }>;
  week: Array<{ date: string; weekday: string; done: number; total: number; isToday: boolean }>;
};

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "শুভরাত্রি";
  if (h < 11) return "শুভসকাল";
  if (h < 16) return "শুভদুপুর";
  if (h < 18) return "শুভবিকেল";
  if (h < 20) return "শুভসন্ধ্যা";
  return "শুভরাত্রি";
}

function RateRing({ rate, size = 96 }: { rate: number | null; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = rate === null ? 0 : rate / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`উপস্থিতির হার ${rate ?? 0}%`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#e2e8f0" strokeWidth={10} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#10b981" strokeWidth={10} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`} className="transition-all duration-700" />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[19px] font-bold leading-none text-slate-800">{rate === null ? "—" : `${toBn(rate)}%`}</span>
        <span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">উপস্থিত</span>
      </span>
    </div>
  );
}

export default function StudentPage() {
  const { data, loading, lastUpdated } = useLiveData<Bundle>("/api/student");
  const study = useLiveData<StudyState>("/api/study");
  const [toggling, setToggling] = useState<number | null>(null);

  async function toggleGoal(goalId: number) {
    setToggling(goalId);
    try {
      const r = await fetch("/api/study", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalId, date: todayLocal() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "সেভ করা যায়নি");
      await study.refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "ব্যর্থ হয়েছে");
    } finally {
      setToggling(null);
    }
  }

  const feeDue = data?.fee.due ?? 0;

  return (
    <div className="space-y-4 pb-20 md:pb-0">
      {/* ── HERO: today's class + join ─────────────────── */}
      <section id="join" className="relative scroll-mt-24 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-800 to-[#16234d] p-5 text-white shadow-[0_20px_50px_-20px_rgb(31_53_111/0.7)] sm:p-6">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-52 w-52 rounded-full bg-brand-500/20 blur-3xl" />
        <div aria-hidden className="pointer-events-none absolute -bottom-16 left-1/3 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />
        <GraduationCap aria-hidden size={150} className="pointer-events-none absolute -bottom-5 right-4 text-white/5" strokeWidth={1.4} />

        <div className="relative flex flex-wrap items-center justify-between gap-2">
          <span className="chip border-white/20 bg-white/10 text-brand-100">{data?.profile.batchBn ?? "আমার ব্যাচ"}</span>
          <LiveBadge lastUpdated={lastUpdated} />
        </div>

        <h1 className="relative mt-3 text-[26px] font-bold leading-8 sm:text-3xl">
          {greeting()}, <span className="text-brand-200">{data?.profile.nameBn?.split(" ")[0] ?? "শিক্ষার্থী"}!</span>
        </h1>
        <p className="relative mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] font-semibold text-brand-100/90">
          {data?.profile.teacher && (
            <span className="flex items-center gap-1.5"><Avatar name={data.profile.teacher.nameBn} color={data.profile.teacher.avatarColor} size={18} className="ring-1 ring-white/30" />{data.profile.teacher.nameBn} · {data.profile.teacher.subject}</span>
          )}
          {data?.profile.schedule && <span className="opacity-80">{data.profile.schedule}</span>}
        </p>

        {/* Join card */}
        <div className="relative mt-4 rounded-2xl border border-white/15 bg-white/[0.07] p-4 backdrop-blur-sm">
          {loading && !data ? (
            <Skeleton className="h-24" />
          ) : data?.latestMeet ? (
            <>
              <p className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                <span className="relative flex h-2.5 w-2.5"><span className="live-dot h-2.5 w-2.5 rounded-full bg-emerald-400" /></span>
                আজকের লাইভ ক্লাস লিংক এসেছে
                {data.latestMeet.pinned && <Pin size={11} className="text-amber-300" />}
              </p>
              {data.latestMeet.message && (
                <blockquote className="mt-2 flex gap-2 text-[13px] font-medium leading-relaxed text-brand-50">
                  <Quote size={14} className="mt-1 shrink-0 text-brand-300/70" />
                  <span>{data.latestMeet.message}</span>
                </blockquote>
              )}
              <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                <a href={data.latestMeet.meetUrl} target="_blank" rel="noreferrer"
                  className="inline-flex h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 px-6 text-xl font-bold text-emerald-950 shadow-[0_12px_30px_-8px_rgb(16_185_129/0.6)] transition hover:brightness-110 active:scale-[0.98]">
                  <Video size={26} strokeWidth={2.4} /> জয়েন ক্লাসে
                </a>
                <div className="flex flex-col items-center justify-center px-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-brand-200">{data.latestMeet.kind === "meet" ? "Meet / Zoom" : "লিংক"}</span>
                  <span className="max-w-36 truncate text-[10px] font-medium text-brand-100/70" title={data.latestMeet.meetUrl}>{data.latestMeet.meetUrl.replace(/^https?:\/\//, "")}</span>
                  <span className="mt-0.5 flex items-center gap-1 text-[10px] font-semibold text-brand-100/70"><Clock3 size={10} /> {timeAgo(data.latestMeet.createdAt)}</span>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-4 py-2">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/10"><Radio size={30} className="text-brand-200" /></span>
              <div>
                <p className="text-[15px] font-bold">লিংক এখনো আসেনি</p>
                <p className="text-[11px] font-medium text-brand-100/80">শিক্ষক পোস্ট করলে এই স্ক্রিনে সাথে সাথে দেখা যাবে — পেজ রিফ্রেশ করতে হবে না।</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Fee banner ───────────────────────────────── */}
      {data && (feeDue > 0 ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3">
          <Wallet size={20} className="shrink-0 text-amber-600" />
          <p className="min-w-0 flex-1 text-[12px] font-semibold leading-snug text-amber-900">
            {data.fee.monthLabel}-এর বেতন বাকি <b>{moneyBn(feeDue)}</b> — bKash/নগদ <b>01711-005001</b> এ পাঠিয়ে রেফারেন্সে কোড <b>{data.profile.code}</b> লিখুন।
          </p>
          <FeeChip status="partial" />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-2.5">
          <CheckCircle2 size={19} className="shrink-0 text-emerald-600" />
          <p className="flex-1 text-[12px] font-semibold text-emerald-800">{data.fee.monthLabel}-এর বেতন পরিশোধিত — ধন্যবাদ!</p>
          <FeeChip status="paid" />
        </div>
      ))}

      {/* ── Stat cards ───────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: BookOpenCheck, label: "সম্পন্ন ক্লাস", value: toBn(data?.stats.completedClasses ?? 0), sub: `সব মিলিয়ে ${toBn(data?.stats.allSessions ?? 0)} টি হয়েছিল`, tone: "text-violet-600 bg-violet-50" },
          { icon: CalendarCheck2, label: "উপস্থিতির হার", value: data?.stats.rate === null || data?.stats.rate === undefined ? "—" : `${toBn(data.stats.rate)}%`, sub: `${toBn(data?.stats.present ?? 0)} উপস্থিত · ${toBn(data?.stats.absent ?? 0)} অনুপস্থিত`, tone: "text-emerald-600 bg-emerald-50" },
          { icon: Wallet, label: "এই মাসের বাকি", value: feeDue > 0 ? moneyBn(feeDue) : "৳০", sub: feeDue > 0 ? "বকেয়া আছে" : "ক্লিয়ার ✓", tone: feeDue > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50" },
        ].map(({ icon: Icon, label, value, sub, tone }) => (
          <div key={label} className="card flex flex-col items-center gap-1.5 p-3 text-center sm:flex-row sm:p-4 sm:text-left">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon size={24} /></span>
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
              <p className="text-[20px] font-bold leading-6 text-slate-900">{loading && !data ? "…" : value}</p>
              <p className="hidden truncate text-[9px] font-medium text-slate-400 sm:block">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Regular Study tracker ─────────────────────── */}
      <section id="study" className="card scroll-mt-24 overflow-hidden">
        <div className="grid lg:grid-cols-5">
          {/* Streak panel */}
          <div className="flex items-center gap-5 border-b border-slate-100 bg-gradient-to-br from-orange-50 to-amber-50/40 p-5 lg:col-span-2 lg:border-b-0 lg:border-r">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg">
              <Flame size={44} strokeWidth={2} />
              <span className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-[15px] font-bold">{toBn(study.data?.streak ?? 0)}</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-600">নিয়মিত পড়া</p>
              <p className="text-[22px] font-bold leading-6 text-slate-900">টানা {toBn(study.data?.streak ?? 0)} দিন</p>
              <p className="mt-0.5 text-[10px] font-semibold text-slate-500">সেরা রেকর্ড: {toBn(study.data?.bestStreak ?? 0)} দিন · মোট {toBn(study.data?.lifetimeChecks ?? 0)} টিক</p>
              {/* week strip */}
              <div className="mt-2 flex gap-1.5">
                {(study.data?.week ?? []).map((d) => {
                  const active = d.done >= Math.ceil(d.total / 2);
                  return (
                    <div key={d.date} title={`${d.date} — ${toBn(d.done)}/${toBn(d.total)}`}
                      className="flex w-8 flex-col items-center gap-1">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold ${active ? "bg-emerald-500 text-white" : d.isToday ? "bg-white text-orange-600 ring-2 ring-orange-400" : "bg-white text-slate-300 ring-1 ring-slate-100"}`}>
                        {active ? <Check size={14} strokeWidth={3} /> : toBn(Number(d.date.slice(8, 10)))}
                      </span>
                      <span className="text-[8px] font-bold uppercase text-slate-400">{d.weekday}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Checklist panel */}
          <div className="p-5 lg:col-span-3">
            <SectionTitle dot="bg-emerald-500" title="আজকের চেকলিস্ট" en="Daily study goals"
              right={<span className="text-[12px] font-bold text-emerald-700">{toBn(study.data?.doneToday ?? 0)}/{toBn(study.data?.total ?? 5)} · {toBn(study.data?.pct ?? 0)}%</span>} />
            <ProgressBar value={study.data?.doneToday ?? 0} max={Math.max(1, study.data?.total ?? 1)} tone="bg-emerald-500" />
            <ul className="mt-3 space-y-2">
              {(study.data?.goals ?? []).map((g) => (
                <li key={g.id}>
                  <button onClick={() => toggleGoal(g.id)} disabled={toggling === g.id} aria-pressed={g.checked}
                    className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition active:scale-[0.99] ${
                      g.checked ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white hover:border-emerald-300 hover:bg-emerald-50/40"
                    }`}>
                    {g.checked
                      ? <CheckCircle2 size={22} className="shrink-0 text-emerald-600" />
                      : <Circle size={22} className="shrink-0 text-slate-300" />}
                    <span className={`text-[13px] font-semibold leading-snug ${g.checked ? "text-emerald-900 line-through decoration-emerald-400/60" : "text-slate-700"}`}>{g.title}</span>
                  </button>
                </li>
              ))}
              {study.loading && !study.data && Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </ul>
            <p className="mt-2.5 text-center text-[11px] font-bold text-emerald-700">{study.data?.message}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-5">
        {/* ── Attendance history ──────────────────────── */}
        <section id="attendance" className="card scroll-mt-24 p-5 xl:col-span-2">
          <SectionTitle dot="bg-brand-500" title="আমার উপস্থিতি" en="Last 35 days"
            right={<RateRing rate={data?.stats.rate ?? null} size={64} />} />
          <div className="flex flex-wrap gap-1.5">
            {(data?.calendar ?? []).map((d) => {
              const tone =
                d.status === "present" ? "bg-emerald-500 text-white"
                : d.status === "late" ? "bg-amber-400 text-white"
                : d.status === "absent" ? "bg-red-400 text-white"
                : "bg-slate-100 text-slate-300";
              const label = d.status === "present" ? "উপস্থিত" : d.status === "late" ? "দেরি" : d.status === "absent" ? "অনুপস্থিত" : "ছুটি/ডেটা নেই";
              return (
                <div key={d.date} title={`${bnDateShort(d.date)} — ${label}`}
                  className={`flex h-7 w-7 items-center justify-center rounded-md text-[10px] font-bold ${tone}`}>
                  {toBn(d.day)}
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold text-slate-500">
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" />উপস্থিত {toBn(data?.stats.present ?? 0)}</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" />দেরি {toBn(data?.stats.late ?? 0)}</span>
            <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-red-400" />অনুপস্থিত {toBn(data?.stats.absent ?? 0)}</span>
          </div>
        </section>

        {/* ── Teacher notes feed ─────────────────────── */}
        <section className="card p-5 xl:col-span-3">
          <SectionTitle dot="bg-amber-500" title="শিক্ষকের বার্তা ও নোটিশ" en="Class feed"
            right={<span className="text-[11px] font-bold text-slate-400">{toBn(data?.feed.length ?? 0)} টি</span>} />
          <ul className="nice-scroll max-h-96 space-y-2 overflow-y-auto">
            {(data?.feed ?? []).map((p) => (
              <li key={p.id} className={`rounded-2xl border p-3 ${p.pinned ? "border-brand-200 bg-brand-50/40" : "border-slate-100"}`}>
                <div className="flex items-start gap-2.5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${p.kind === "meet" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                    {p.kind === "meet" ? <Video size={17} /> : <StickyNote size={17} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                      {p.pinned && <Pin size={10} className="text-brand-500" />}
                      {p.teacherBn} · {timeAgo(p.createdAt)}
                    </p>
                    {p.message && <p className="mt-1 text-[12px] font-medium leading-snug text-slate-700">{p.message}</p>}
                    {p.meetUrl && (
                      <a href={p.meetUrl} target="_blank" rel="noreferrer"
                        className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white transition hover:bg-emerald-700">
                        <Video size={13} /> জয়েন করুন
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
            {!loading && (data?.feed.length ?? 0) === 0 && <EmptyState icon={StickyNote} title="এখনো কোনো বার্তা নেই" hint="শিক্ষক পোস্ট করলে এখানে লাইভ দেখা যাবে।" />}
          </ul>
        </section>
      </div>

      {/* ── Mobile sticky join bar ───────────────────── */}
      {data?.latestMeet?.meetUrl && (
        <div className="no-print fixed inset-x-4 bottom-4 z-40 md:hidden">
          <a href={data.latestMeet.meetUrl} target="_blank" rel="noreferrer"
            className="flex h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-600 text-lg font-bold text-white shadow-[0_16px_40px_-10px_rgb(5_150_105/0.7)] ring-4 ring-emerald-500/30 active:scale-[0.98]">
            <Video size={22} /> ক্লাসে জয়েন করুন
          </a>
        </div>
      )}
    </div>
  );
}
