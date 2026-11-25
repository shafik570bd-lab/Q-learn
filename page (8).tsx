"use client";

import { useState } from "react";
import {
  BarChart3, Printer, FileSpreadsheet, Users, Percent, Wallet, BookOpenCheck, Info,
} from "lucide-react";
import { useLiveData, Skeleton } from "@/components/live";
import { RateBadge, FeeChip, Avatar, SectionTitle } from "@/components/kit";
import { toBn, moneyBn, taka } from "@/lib/format";

type ReportRow = {
  id: number; code: string; name: string; nameBn: string; batchId: number; batchBn: string;
  avatarColor: string; joinedAt: string; batchSessions: number; attended: number; marked: number;
  rate: number | null; feeDue: number; feeStatus: "paid" | "due";
};
type ReportResponse = {
  range: "all" | "month"; month: string; monthLabel: string;
  summary: { students: number; attendedSum: number; markedSum: number; avgRate: number; totalDue: number; dueStudents: number };
  rows: ReportRow[];
};

export default function ReportsPage() {
  const [batchId, setBatchId] = useState("");
  const [range, setRange] = useState<"all" | "month">("all");
  const { data: batchData } = useLiveData<{ batches: Array<{ id: number; nameBn: string }> }>("/api/batches");
  const url = `/api/reports?range=${range}${batchId ? `&batchId=${batchId}` : ""}`;
  const { data, loading } = useLiveData<ReportResponse>(url);
  const rows = data?.rows ?? [];

  function downloadCsv() {
    if (!data) return;
    const header = ["কোড", "নাম (বাংলা)", "ব্যাচ", "অনুষ্ঠিত ক্লাস", "উপস্থিত", "চিহ্নিত", "উপস্থিতির হার %", "বকেয়া (BDT)"];
    const lines = data.rows.map((r) => [
      r.code, r.nameBn, r.batchBn, String(r.batchSessions), String(r.attended), String(r.marked),
      r.rate === null ? "N/A" : String(r.rate), String(r.feeDue),
    ].map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","));
    const csv = "\ufeff" + [header.join(","), ...lines].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `coaching-class-count-report-${data.range === "month" ? data.month : "all-time"}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="space-y-4">
      {/* ── Controls ────────────────────────────────── */}
      <div className="no-print flex flex-col gap-2 sm:flex-row sm:items-center">
        <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="input w-full sm:w-64" aria-label="ব্যাচ">
          <option value="">সব ব্যাচ</option>
          {(batchData?.batches ?? []).map((b) => <option key={b.id} value={b.id}>{b.nameBn}</option>)}
        </select>
        <div className="flex gap-1.5">
          {([["all", "সর্বকাল"], ["month", "এই মাস"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setRange(id)}
              className={`h-11 flex-1 rounded-xl border px-5 text-[13px] font-bold transition sm:flex-none ${range === id ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-brand-300"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 sm:ml-auto">
          <button onClick={downloadCsv} className="btn-ghost h-11 text-[13px]"><FileSpreadsheet size={17} /> CSV</button>
          <button onClick={() => window.print()} className="btn-primary h-11 text-[13px]"><Printer size={17} /> প্রিন্ট / PDF</button>
        </div>
      </div>

      {/* ── Summary strip ───────────────────────────── */}
      <div className="card grid grid-cols-2 divide-slate-100 p-4 sm:grid-cols-4 sm:divide-x">
        {[
          { icon: Users, label: "শিক্ষার্থী", value: toBn(data?.summary.students ?? 0), tone: "text-brand-600 bg-brand-50" },
          { icon: Percent, label: "গড় উপস্থিতি", value: `${toBn(data?.summary.avgRate ?? 0)}%`, tone: "text-emerald-600 bg-emerald-50" },
          { icon: BookOpenCheck, label: "মোট উপস্থিত ক্লাস", value: toBn(data?.summary.attendedSum ?? 0), tone: "text-violet-600 bg-violet-50" },
          { icon: Wallet, label: "মোট বকেয়া", value: moneyBn(data?.summary.totalDue ?? 0), tone: "text-red-600 bg-red-50" },
        ].map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="flex items-center gap-3 px-3 py-2">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone}`}><Icon size={21} /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
              <p className="truncate text-[19px] font-bold leading-6 text-slate-900">{loading && !data ? "…" : value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Ledger table ────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 p-5 pb-3">
          <SectionTitle dot="bg-violet-500" title="ক্লাস-কাউন্ট সামারি" en="Class-count report" />
          <p className="hidden items-center gap-1.5 text-[10px] font-semibold text-slate-400 sm:flex"><Info size={12} /> {range === "month" ? data?.monthLabel : "সর্বকাল"} · আদর্শ একাডেমী</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="th">#</th>
                <th className="th">শিক্ষার্থী</th>
                <th className="th">ব্যাচ</th>
                <th className="th text-right">অনুষ্ঠিত ক্লাস</th>
                <th className="th text-right">উপস্থিত</th>
                <th className="th text-right">হার</th>
                <th className="th text-right">বকেয়া</th>
                <th className="th">পেমেন্ট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r, i) => (
                <tr key={r.id} className="transition hover:bg-slate-50/70">
                  <td className="td text-slate-400">{toBn(i + 1)}</td>
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.nameBn} color={r.avatarColor} size={32} />
                      <div>
                        <p className="font-bold text-slate-800">{r.nameBn}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{r.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td text-slate-500">{r.batchBn}</td>
                  <td className="td text-right font-semibold">{toBn(r.batchSessions)}</td>
                  <td className="td text-right font-semibold">{toBn(r.attended)}<span className="text-slate-400">/{toBn(r.marked)}</span></td>
                  <td className="td text-right"><RateBadge rate={r.rate} /></td>
                  <td className="td text-right font-bold text-red-500">{r.feeDue > 0 ? taka(r.feeDue) : "—"}</td>
                  <td className="td"><FeeChip status={r.feeStatus === "paid" ? "paid" : "due"} /></td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/60 font-bold text-slate-700">
                  <td className="td" colSpan={3}>মোট ({toBn(rows.length)} জন)</td>
                  <td className="td text-right">{toBn(rows.reduce((a, r) => a + r.batchSessions, 0))}</td>
                  <td className="td text-right">{toBn(rows.reduce((a, r) => a + r.attended, 0))}</td>
                  <td className="td text-right">{toBn(data?.summary.avgRate ?? 0)}%</td>
                  <td className="td text-right text-red-500">{taka(data?.summary.totalDue ?? 0)}</td>
                  <td className="td text-[11px] text-slate-400">{toBn(data?.summary.dueStudents ?? 0)} জন বাকি</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        {loading && rows.length === 0 && <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-11" />)}</div>}
        <p className="border-t border-slate-100 px-5 py-3 text-[10px] font-medium text-slate-400">
          প্রতিবেদকের স্বাক্ষর: ______________________ · তারিখ: {new Date().toLocaleDateString("bn-BD")} · আদর্শ একাডেমী — সব হিসেব এক জায়গায়
        </p>
      </div>
    </div>
  );
}
