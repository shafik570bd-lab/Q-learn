"use client";

import { useMemo, useState } from "react";
import { CalendarCheck2, ChevronLeft, ChevronRight, ClipboardCheck, Flame, MousePointerClick, CalendarDays } from "lucide-react";
import { useLiveData, Skeleton } from "@/components/live";
import { SectionTitle } from "@/components/kit";
import AttendanceMarker from "@/components/attendance-marker";
import { toBn, bnMonthLabel, todayLocal } from "@/lib/format";

const WD = ["শনি", "রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র"];

type Day = { date: string; marked: number; attended: number; rate: number };

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function AttendancePage() {
  const [month, setMonth] = useState(todayLocal().slice(0, 7));
  const [batchId, setBatchId] = useState("");
  const { data: batchData } = useLiveData<{ batches: Array<{ id: number; nameBn: string; studentCount: number }> }>("/api/batches");
  const url = `/api/attendance?scope=calendar&month=${month}${batchId ? `&batchId=${batchId}` : ""}`;
  const { data, loading } = useLiveData<{ days: Day[]; monthRate: number; monthMarked: number; monthAttended: number }>(url);

  const cells = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const offset = (new Date(y, m - 1, 1).getDay() + 1) % 7;
    const map = new Map((data?.days ?? []).map((d) => [d.date, d]));
    const out: Array<(Day & { day: number }) | null> = [];
    for (let i = 0; i < offset; i++) out.push(null);
    const todayIso = todayLocal();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`;
      const hit = map.get(date);
      out.push(hit ? { ...hit, day: d } : null);
    }
    void todayIso;
    return out;
  }, [data, month]);

  const todayIso = todayLocal();
  const bestDay = (data?.days ?? []).reduce<Day | null>((acc, d) => (d.marked >= 10 && (!acc || d.rate > acc.rate) ? d : acc), null);

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      {/* ── Month calendar ─────────────────────────── */}
      <section className="card p-5 xl:col-span-7">
        <SectionTitle dot="bg-emerald-500" title="মাসিক উপস্থিতি ক্যালেন্ডার" en="Monthly calendar"
          right={
            <div className="flex items-center gap-1.5">
              <button onClick={() => setMonth(shiftMonth(month, -1))} className="icon-btn" aria-label="আগের মাস"><ChevronLeft size={17} /></button>
              <span className="min-w-28 text-center text-[13px] font-bold text-slate-700">{bnMonthLabel(month)}</span>
              <button onClick={() => setMonth(shiftMonth(month, 1))} className="icon-btn" aria-label="পরের মাস" disabled={month >= todayLocal().slice(0, 7)}><ChevronRight size={17} /></button>
            </div>
          } />

        <div className="mb-3 flex flex-wrap items-center gap-2">
          <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="input h-10 w-56 text-[13px]" aria-label="ব্যাচ ফিল্টার">
            <option value="">সব ব্যাচ মিলিয়ে</option>
            {(batchData?.batches ?? []).map((b) => <option key={b.id} value={b.id}>{b.nameBn}</option>)}
          </select>
          <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700"><Flame size={12} /> মাসিক হার: {loading ? "…" : `${toBn(data?.monthRate ?? 0)}%`}</span>
          <span className="chip border-slate-200 bg-slate-50 text-slate-500"><ClipboardCheck size={12} /> মোট মার্ক: {toBn(data?.monthMarked ?? 0)}</span>
          {bestDay && <span className="chip border-amber-200 bg-amber-50 text-amber-700"><CalendarDays size={12} /> সেরা দিন: {toBn(Number(bestDay.date.slice(8, 10)))} তারিখ ({toBn(bestDay.rate)}%)</span>}
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {WD.map((d) => <div key={d} className="pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{d}</div>)}
          {cells.map((cell, i) => {
            if (!cell) {
              const dayNum = i - (cells.findIndex((c) => c !== null)) + 1;
              void dayNum;
              return <div key={`b-${i}`} className="h-14 rounded-xl bg-transparent" />;
            }
            const isToday = cell.date === todayIso;
            const tone =
              cell.rate >= 85 ? "bg-emerald-500 text-white shadow-sm"
              : cell.rate >= 70 ? "bg-emerald-100 text-emerald-900"
              : cell.rate >= 50 ? "bg-amber-100 text-amber-900"
              : "bg-red-100 text-red-800";
            return (
              <div key={cell.date} title={`${toBn(cell.marked)} জন মার্ক · ${toBn(cell.rate)}% উপস্থিত`}
                className={`flex h-14 flex-col items-center justify-center rounded-xl ${tone} ${isToday ? "ring-2 ring-brand-600 ring-offset-2" : ""}`}>
                <span className="text-[15px] font-bold leading-4">{toBn(cell.day)}</span>
                <span className="text-[9px] font-bold opacity-80">{toBn(cell.rate)}%</span>
              </div>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-dashed border-slate-200 pt-3 text-[10px] font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-500" /> ৮৫%+</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-200" /> ৭০–৮৫%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-200" /> ৫০–৭০%</span>
          <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded bg-red-100 ring-1 ring-red-200" /> ৫০% এর নিচে</span>
          <span className="ml-auto flex items-center gap-1 text-slate-400"><MousePointerClick size={12} /> মার্ক করা মাত্রই সবাই লাইভ দেখতে পাবে</span>
        </div>
      </section>

      {/* ── Mark today's attendance ─────────────────── */}
      <section className="card h-fit p-5 xl:sticky xl:top-20 xl:col-span-5">
        <SectionTitle dot="bg-brand-500" title="উপস্থিতি মার্কিং" en="Mark attendance"
          right={<span className="flex items-center gap-1 text-[11px] font-bold text-slate-400"><CalendarCheck2 size={13} /> {toBn(todayIso.slice(8, 10))} {bnMonthLabel(todayIso.slice(0, 7))}</span>} />
        {(batchData?.batches ?? []).length > 0
          ? <AttendanceMarker compact batches={batchData?.batches ?? []} />
          : <Skeleton className="h-72" />}
      </section>
    </div>
  );
}
