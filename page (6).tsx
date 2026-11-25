"use client";

import { useEffect, useState } from "react";
import {
  Wallet, HandCoins, Search, X, TrendingDown, CircleCheck, CircleDollarSign, UsersRound, Receipt,
} from "lucide-react";
import { useLiveData, Skeleton } from "@/components/live";
import { StatCard, FeeChip, Avatar, SectionTitle, EmptyState } from "@/components/kit";
import CollectModal, { type CollectTarget } from "@/components/collect-modal";
import { toBn, moneyBn, bnMonthLabel, currentMonth } from "@/lib/format";

type FeeRow = {
  feeId: number; studentId: number; code: string; name: string; nameBn: string; phone: string;
  batchBn: string; avatarColor: string; amount: number; paid: number; due: number;
  paidOn: string; method: string; status: "paid" | "partial" | "due";
};
type FeesResponse = {
  month: string;
  summary: { collected: number; dueTotal: number; dueCount: number; partialCount: number; paidCount: number; expected: number };
  rows: FeeRow[];
};

export default function FeesPage() {
  const [month, setMonth] = useState(currentMonth());
  const [status, setStatus] = useState<"all" | "due" | "partial" | "paid">("all");
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [collect, setCollect] = useState<CollectTarget | null>(null);

  // light debounce
  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 200);
    return () => clearTimeout(t);
  }, [qInput]);

  const url = `/api/fees?month=${month}&status=${status}&q=${encodeURIComponent(q)}`;
  const { data, loading, refresh } = useLiveData<FeesResponse>(url);
  const summary = data?.summary;
  const rows = data?.rows ?? [];
  const collectedPct = summary && summary.expected > 0 ? Math.round((summary.collected / summary.expected) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* ── Summary cards ───────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {loading && !data ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />) : (
          <>
            <StatCard icon={CircleDollarSign} label="আদায় হয়েছে" value={moneyBn(summary?.collected ?? 0)}
              sub={`${toBn(collectedPct)}% এই মাসের ফি`} tone="green" />
            <StatCard icon={TrendingDown} label="মোট বকেয়া" value={moneyBn(summary?.dueTotal ?? 0)}
              sub={`${toBn(summary?.dueCount ?? 0)} জন সম্পূর্ণ বাকি · ${toBn(summary?.partialCount ?? 0)} জন আংশিক`} tone="red" />
            <StatCard icon={CircleCheck} label="পরিশোধ সম্পন্ন" value={toBn(summary?.paidCount ?? 0)}
              sub="এই মাসে ক্লিয়ার" tone="blue" />
            <StatCard icon={UsersRound} label="মোট শিক্ষার্থী" value={toBn((summary?.paidCount ?? 0) + (summary?.dueCount ?? 0) + (summary?.partialCount ?? 0))}
              sub={`প্রত্যাশিত ${moneyBn(summary?.expected ?? 0)}`} tone="violet" />
          </>
        )}
      </div>

      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)}
          className="input w-full lg:w-44" aria-label="মাস" />
        <div className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="নাম বা কোড দিয়ে খুঁজুন…" className="input pl-10" />
          {qInput && <button onClick={() => setQInput("")} aria-label="মুছুন" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"><X size={17} /></button>}
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {([["all", "সবাই"], ["due", "বকেয়া"], ["partial", "আংশিক"], ["paid", "পরিশোধিত"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setStatus(id)}
              className={`h-11 whitespace-nowrap rounded-xl border px-4 text-[13px] font-bold transition ${status === id ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-brand-300"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Dues table ──────────────────────────────── */}
      <div className="card overflow-hidden">
        <SectionTitle dot="bg-red-500" title={`বেতন তালিকা · ${bnMonthLabel(month)}`} en="Fee ledger"
          right={<span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><Receipt size={13} /> {toBn(rows.length)} টি এন্ট্রি</span>} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                <th className="th">শিক্ষার্থী</th>
                <th className="th">ব্যাচ</th>
                <th className="th text-right">ফি</th>
                <th className="th text-right">পরিশোধ</th>
                <th className="th text-right">বকেয়া</th>
                <th className="th">অবস্থা</th>
                <th className="th text-right">সংগ্রহ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.feeId} className="transition hover:bg-slate-50/70">
                  <td className="td">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={r.nameBn} color={r.avatarColor} size={34} />
                      <div>
                        <p className="font-bold text-slate-800">{r.nameBn}</p>
                        <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{r.code}{r.paidOn ? ` · ${r.paidOn}` : ""}{r.method ? ` · ${r.method}` : ""}</p>
                      </div>
                    </div>
                  </td>
                  <td className="td text-slate-500">{r.batchBn}</td>
                  <td className="td text-right font-semibold">{moneyBn(r.amount)}</td>
                  <td className="td text-right font-semibold text-emerald-600">{moneyBn(r.paid)}</td>
                  <td className="td text-right font-bold text-red-500">{r.due > 0 ? moneyBn(r.due) : "—"}</td>
                  <td className="td"><FeeChip status={r.status} /></td>
                  <td className="td text-right">
                    {r.due > 0 ? (
                      <button onClick={() => setCollect({ studentId: r.studentId, nameBn: r.nameBn, name: r.name, code: r.code, avatarColor: r.avatarColor, batchBn: r.batchBn, due: r.due, month })}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-brand-600 px-3 text-[12px] font-bold text-white transition hover:bg-brand-700">
                        <HandCoins size={14} /> সংগ্রহ
                      </button>
                    ) : <span className="text-[11px] font-bold text-emerald-600">ক্লিয়ার</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && rows.length === 0 && <EmptyState icon={Wallet} title="এই ফিল্টারে কেউ নেই" hint="মাস বা ফিল্টার পরিবর্তন করে দেখুন।" />}
        {loading && rows.length === 0 && <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>}
      </div>

      <CollectModal target={collect} onClose={() => setCollect(null)} onDone={refresh} />
    </div>
  );
}
