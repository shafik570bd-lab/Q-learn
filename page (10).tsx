"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Users, Layers, CalendarCheck2, Wallet, ChevronRight, UserPlus,
  HandCoins, AlertCircle, Video, BadgePercent, ArrowRight, ClipboardCheck,
} from "lucide-react";
import { useLiveData, Skeleton } from "@/components/live";
import { StatCard, SectionTitle, Avatar, FeeChip, ProgressBar } from "@/components/kit";
import CollectModal, { type CollectTarget } from "@/components/collect-modal";
import { toBn, moneyBn, bnDateShort } from "@/lib/format";

type DashboardData = {
  today: string; month: string; monthLabel: string;
  stats: {
    totalStudents: number; activeBatches: number; todayRate: number;
    todayMarked: number; todayAttended: number; pendingDues: number; dueCount: number;
    collectedThisMonth: number; monthSessions: number; monthRate: number;
  };
  batches: Array<{ id: number; nameBn: string; subject: string; schedule: string; room: string; monthlyFee: number; capacity: number; teacherBn: string; studentCount: number; presentToday: number }>;
  recentStudents: Array<{ id: number; code: string; joinedAt: string; name: string; nameBn: string; batchBn: string; avatarColor: string }>;
  dues: Array<{ feeId: number; studentId: number; code: string; name: string; nameBn: string; batchBn: string; avatarColor: string; amount: number; paid: number; due: number }>;
  calendar: Array<{ date: string; marked: number; attended: number; rate: number }>;
  trend: Array<{ date: string; marked: number; attended: number; rate: number }>;
};

const BATCH_DOTS = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
const WD = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র"];

function calendarCells(month: string, calendar: DashboardData["calendar"]) {
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();
  const first = new Date(y, m - 1, 1);
  const offset = (first.getDay() + 1) % 7; // Saturday-first week
  const map = new Map(calendar.map((c) => [c.date, c]));
  const cells: Array<{ day: number; date: string; rate: number | null; marked: number } | null> = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${month}-${String(d).padStart(2, "0")}`;
    const hit = map.get(date);
    cells.push({ day: d, date, rate: hit ? hit.rate : null, marked: hit?.marked ?? 0 });
  }
  return cells;
}

export default function AdminDashboard() {
  const { data, loading, error, refresh } = useLiveData<DashboardData>("/api/dashboard");
  const [collect, setCollect] = useState<CollectTarget | null>(null);

  const cells = useMemo(() => (data ? calendarCells(data.month, data.calendar) : []), [data]);
  const todayIso = data?.today ?? "";
  const expected = (data?.stats.collectedThisMonth ?? 0) + (data?.stats.pendingDues ?? 0);
  const collectedPct = expected > 0 ? Math.round(((data?.stats.collectedThisMonth ?? 0) / expected) * 100) : 0;

  if (error && !data) {
    return (
      <div className="card flex flex-col items-center gap-3 p-10 text-center">
        <AlertCircle className="text-red-400" size={32} />
        <p className="font-bold text-slate-700">ড্যাশবোর্ড লোড করা যায়নি</p>
        <p className="text-sm text-slate-400">{error}</p>
        <button onClick={refresh} className="btn-primary">আবার চেষ্টা করুন</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Stat cards ─────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {loading && !data ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard icon={Users} label="মোট স্টুডেন্ট" value={toBn(data?.stats.totalStudents ?? 0)}
              sub="সবার ব্যাচে ভর্তি" tone="blue" />
            <StatCard icon={Layers} label="সক্রিয় ব্যাচ" value={toBn(data?.stats.activeBatches ?? 0)}
              sub={`এই মাসে ${toBn(data?.stats.monthSessions ?? 0)} টি ক্লাস হয়েছে`} tone="violet" />
            <StatCard icon={CalendarCheck2} label="আজ উপস্থিত" value={`${toBn(data?.stats.todayRate ?? 0)}%`}
              sub={`${toBn(data?.stats.todayAttended ?? 0)}/${toBn(data?.stats.totalStudents ?? 0)} জন হাজির`} tone="green" />
            <StatCard icon={Wallet} label="বাকি বেতন" value={moneyBn(data?.stats.pendingDues ?? 0)}
              sub={`${toBn(data?.stats.dueCount ?? 0)} জনের বকেয়া`} tone="red" />
          </>
        )}
      </div>

      {/* ── Three-column body ───────────────────────── */}
      <div className="grid gap-4 xl:grid-cols-12">
        {/* Batch list */}
        <section className="card p-5 xl:col-span-4">
          <SectionTitle dot="bg-blue-500" title="কে কোন ব্যাচে" en="Batches"
            right={<Link href="/admin/batches" className="flex items-center gap-0.5 text-[12px] font-bold text-brand-700 hover:underline">সব <ChevronRight size={14} /></Link>} />
          <ul className="nice-scroll max-h-[380px] divide-y divide-slate-100 overflow-y-auto">
            {(data?.batches ?? []).map((b, i) => (
              <li key={b.id} className="flex items-center gap-3 py-3">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${BATCH_DOTS[i % BATCH_DOTS.length]}`} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-800">{b.nameBn}</p>
                  <p className="truncate text-[10px] font-medium text-slate-400">{b.teacherBn} · {b.room}</p>
                </div>
                <div className="text-right">
                  <p className="text-[15px] font-bold leading-4 text-slate-800">{toBn(b.studentCount)}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">শিক্ষার্থী</p>
                </div>
                <div className="w-12 text-right">
                  <p className={`text-[13px] font-bold leading-4 ${b.presentToday > 0 ? "text-emerald-600" : "text-slate-300"}`}>{toBn(b.presentToday)}</p>
                  <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">আজ হাজির</p>
                </div>
              </li>
            ))}
            {loading && !data && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="my-2 h-11" />)}
          </ul>
        </section>

        {/* Attendance calendar */}
        <section className="card p-5 xl:col-span-4">
          <SectionTitle dot="bg-emerald-500" title={`উপস্থিতি ক্যালেন্ডার · ${data?.monthLabel ?? ""}`} en="Attendance"
            right={<span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">এই মাসে {toBn(data?.stats.monthRate ?? 0)}%</span>} />
          <div className="grid grid-cols-7 gap-1 text-center">
            {WD.map((d) => <div key={d} className="py-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">{d}</div>)}
            {cells.map((cell, i) => {
              if (!cell) return <div key={`x-${i}`} />;
              const isToday = cell.date === todayIso;
              const tone =
                cell.rate === null ? "bg-slate-50 text-slate-300"
                : cell.rate >= 85 ? "bg-emerald-500 text-white"
                : cell.rate >= 70 ? "bg-emerald-200 text-emerald-900"
                : cell.rate >= 50 ? "bg-amber-200 text-amber-900"
                : "bg-red-200 text-red-800";
              return (
                <div key={cell.date}
                  title={cell.marked ? `${toBn(cell.marked)} জন মার্ক · ${toBn(cell.rate ?? 0)}% উপস্থিত` : "ডেটা নেই"}
                  className={`flex h-9 flex-col items-center justify-center rounded-lg text-[12px] font-bold leading-none ${tone} ${isToday ? "ring-2 ring-brand-600 ring-offset-1" : ""}`}>
                  {toBn(cell.day)}
                </div>
              );
            })}
          </div>
          {/* 14-day trend */}
          <div className="mt-3 border-t border-dashed border-slate-200 pt-3">
            <p className="mb-1.5 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
              <span>গত ১৪ দিনের ট্রেন্ড</span><span className="normal-case">সবুজ = বেশি উপস্থিতি</span>
            </p>
            <div className="flex h-14 items-end gap-1">
              {(data?.trend ?? []).map((t) => (
                <div key={t.date} title={`${bnDateShort(t.date)} — ${toBn(t.rate)}%`}
                  className="flex-1 rounded-t-sm bg-emerald-400/85 transition-all hover:bg-emerald-500"
                  style={{ height: `${Math.max(8, t.rate)}%`, opacity: t.marked ? 1 : 0.35 }} />
              ))}
              {loading && !data && <Skeleton className="h-full w-full" />}
            </div>
          </div>
        </section>

        {/* Dues / collections */}
        <section className="card flex flex-col p-5 xl:col-span-4">
          <SectionTitle dot="bg-red-500" title="বেতন / বাকি" en="Fees"
            right={<Link href="/admin/fees" className="flex items-center gap-0.5 text-[12px] font-bold text-brand-700 hover:underline">সব <ChevronRight size={14} /></Link>} />
          <div className="mb-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex items-center justify-between text-[12px] font-bold">
              <span className="text-slate-500">এই মাসে আদায়</span>
              <span className="text-emerald-600">{moneyBn(data?.stats.collectedThisMonth ?? 0)} <span className="text-slate-400">/ {moneyBn(expected)}</span></span>
            </div>
            <div className="mt-1.5"><ProgressBar value={data?.stats.collectedThisMonth ?? 0} max={Math.max(1, expected)} tone="bg-emerald-500" /></div>
            <p className="mt-1 text-right text-[10px] font-bold text-emerald-700">{toBn(collectedPct)}% আদায় হয়েছে</p>
          </div>
          <ul className="nice-scroll max-h-[258px] flex-1 divide-y divide-slate-100 overflow-y-auto">
            {(data?.dues ?? []).map((d) => (
              <li key={d.feeId} className="flex items-center gap-2.5 py-2.5">
                <Avatar name={d.nameBn} color={d.avatarColor} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[12px] font-bold text-slate-800">{d.nameBn}</p>
                  <p className="truncate text-[9px] font-semibold uppercase tracking-wide text-slate-400">{d.code} · {d.batchBn}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-bold text-red-500">{moneyBn(d.due)}</p>
                  <button
                    onClick={() => setCollect({ studentId: d.studentId, nameBn: d.nameBn, name: d.name, code: d.code, avatarColor: d.avatarColor, batchBn: d.batchBn, due: d.due })}
                    className="mt-0.5 inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2 py-1 text-[10px] font-bold text-white transition hover:bg-brand-700">
                    <HandCoins size={11} /> সংগ্রহ
                  </button>
                </div>
              </li>
            ))}
            {!loading && data?.dues.length === 0 && (
              <li className="py-6 text-center">
                <BadgePercent size={26} className="mx-auto text-emerald-500" />
                <p className="mt-1 text-[13px] font-bold text-emerald-700">সব বেতন আদায় হয়েছে!</p>
              </li>
            )}
          </ul>
        </section>
      </div>

      {/* ── Bottom row ──────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <SectionTitle dot="bg-amber-500" title="সাম্প্রতিক ভর্তি" en="New admissions"
            right={<Link href="/admin/students" className="flex items-center gap-0.5 text-[12px] font-bold text-brand-700 hover:underline">ডিরেক্টরি <ArrowRight size={13} /></Link>} />
          <ul className="grid gap-2 sm:grid-cols-2">
            {(data?.recentStudents ?? []).map((s) => (
              <li key={s.id} className="flex items-center gap-2.5 rounded-2xl border border-slate-100 p-2.5 transition hover:border-brand-200 hover:bg-brand-50/40">
                <Avatar name={s.nameBn} color={s.avatarColor} size={38} />
                <div className="min-w-0">
                  <p className="flex items-center gap-1 truncate text-[12px] font-bold text-slate-800">{s.nameBn}<UserPlus size={11} className="shrink-0 text-amber-500" /></p>
                  <p className="truncate text-[9px] font-semibold text-slate-400">{s.batchBn}</p>
                  <p className="text-[9px] font-medium text-slate-400">{bnDateShort(s.joinedAt)} ভর্তি</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="card flex flex-col justify-between gap-4 p-5">
          <SectionTitle dot="bg-violet-500" title="কি করতে চান?" en="Quick actions" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Link href="/admin/attendance" className="group flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 transition hover:border-emerald-400 hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500 text-white"><ClipboardCheck size={22} /></span>
              <span>
                <span className="block text-[13px] font-bold text-emerald-900">উপস্থিতি মার্ক করুন</span>
                <span className="text-[10px] font-medium text-emerald-700/80">ব্যাচ বেছে এক ট্যাপে হাজিরা</span>
              </span>
            </Link>
            <Link href="/admin/fees" className="group flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50/60 p-4 transition hover:border-red-300 hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500 text-white"><Wallet size={22} /></span>
              <span>
                <span className="block text-[13px] font-bold text-red-900">বেতন সংগ্রহ</span>
                <span className="text-[10px] font-medium text-red-700/80">বকেয়া তালিকা থেকে সরাসরি</span>
              </span>
            </Link>
            <Link href="/admin/reports" className="group flex items-center gap-3 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 transition hover:border-violet-300 hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500 text-white"><BadgePercent size={22} /></span>
              <span>
                <span className="block text-[13px] font-bold text-violet-900">ক্লাস-কাউন্ট রিপোর্ট</span>
                <span className="text-[10px] font-medium text-violet-700/80">প্রিন্ট বা CSV ডাউনলোড</span>
              </span>
            </Link>
            <Link href="/admin/app" className="group flex items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 transition hover:border-brand-400 hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white"><Video size={22} /></span>
              <span>
                <span className="block text-[13px] font-bold text-brand-900">অ্যান্ড্রয়েড APK</span>
                <span className="text-[10px] font-medium text-brand-700/80">PWABuilder · Capacitor গাইড</span>
              </span>
            </Link>
          </div>
        </section>
      </div>

      <CollectModal target={collect} onClose={() => setCollect(null)} onDone={refresh} />
    </div>
  );
}
