"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, UserPlus, X, Phone, ShieldCheck, Mail, BookOpen, HandCoins,
  GraduationCap, CalendarDays, Percent, Users, Loader2, ChevronRight,
} from "lucide-react";
import { useLiveData, toast, Skeleton } from "@/components/live";
import { Avatar, RateBadge, FeeChip, ProgressBar, EmptyState } from "@/components/kit";
import CollectModal, { type CollectTarget } from "@/components/collect-modal";
import { toBn, moneyBn, bnDateShort } from "@/lib/format";

type StudentRow = {
  id: number; code: string; name: string; nameBn: string; phone: string; email: string;
  guardian: string; guardianPhone: string; avatarColor: string;
  batchId: number; batchBn: string; batchSubject: string; discount: number; joinedAt: string;
  feeAmount: number; feePaid: number; feeDue: number; feeStatus: "paid" | "partial" | "due";
  attended: number; totalAtt: number; rate: number | null;
};
type Batch = { id: number; nameBn: string; studentCount?: number };

function StudentsInner() {
  const search = useSearchParams();
  const initialBatch = search.get("batchId") || "";
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [batchId, setBatchId] = useState(initialBatch);
  const [fee, setFee] = useState<"all" | "due" | "paid">("all");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [admitOpen, setAdmitOpen] = useState(false);
  const [collect, setCollect] = useState<CollectTarget | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(qInput.trim()), 250);
    return () => clearTimeout(t);
  }, [qInput]);

  const url = `/api/students?q=${encodeURIComponent(q)}&batchId=${batchId}&fee=${fee}`;
  const { data, loading, refresh } = useLiveData<{ students: StudentRow[]; month: string }>(url);
  const { data: batchData } = useLiveData<{ batches: Batch[] }>("/api/batches");

  const students = useMemo(() => data?.students ?? [], [data]);
  const selected = students.find((s) => s.id === selectedId) ?? null;

  useEffect(() => {
    if (!selectedId && students.length) setSelectedId(students[0].id);
  }, [students, selectedId]);

  return (
    <div className="space-y-4">
      {/* ── Toolbar ─────────────────────────────────── */}
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="খুঁজুন — নাম, কোড (STU-2401) বা অভিভাবকের নাম…"
            className="input pl-10"
            aria-label="শিক্ষার্থী খুঁজুন"
          />
          {qInput && (
            <button onClick={() => setQInput("")} aria-label="মুছুন"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700">
              <X size={17} />
            </button>
          )}
        </div>
        <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className="input w-full lg:w-56" aria-label="ব্যাচ ফিল্টার">
          <option value="">সব ব্যাচ</option>
          {(batchData?.batches ?? []).map((b) => <option key={b.id} value={b.id}>{b.nameBn}</option>)}
        </select>
        <div className="flex gap-1.5">
          {([["all", "সবাই"], ["due", "বকেয়া"], ["paid", "পরিশোধিত"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFee(id)}
              className={`h-11 rounded-xl border px-4 text-[13px] font-bold transition ${
                fee === id ? "border-brand-600 bg-brand-600 text-white" : "border-slate-200 bg-white text-slate-500 hover:border-brand-300"
              }`}>{label}</button>
          ))}
        </div>
        <button onClick={() => setAdmitOpen(true)} className="btn-primary"><UserPlus size={17} /> ভর্তি করুন</button>
      </div>

      <p className="text-[12px] font-semibold text-slate-400">
        {loading ? "লোড হচ্ছে…" : <>{toBn(students.length)} জন শিক্ষার্থী {q && <>— “{q}”</>}</>}
      </p>

      {/* ── List + detail ───────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className="card overflow-hidden lg:col-span-7">
          <ul className="nice-scroll max-h-[640px] divide-y divide-slate-100 overflow-y-auto">
            {loading && students.length === 0 && Array.from({ length: 8 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 p-3"><Skeleton className="h-12 w-12 rounded-full" /><Skeleton className="h-10 flex-1" /></li>
            ))}
            {students.map((s) => (
              <li key={s.id}>
                <button onClick={() => setSelectedId(s.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition sm:px-4 ${selectedId === s.id ? "bg-brand-50/70 ring-inset" : "hover:bg-slate-50"}`}>
                  <Avatar name={s.nameBn} color={s.avatarColor} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2">
                      <span className="truncate text-[14px] font-bold text-slate-800">{s.nameBn}</span>
                      <span className="hidden text-[10px] font-semibold uppercase tracking-wide text-slate-400 xl:inline">{s.name}</span>
                    </p>
                    <p className="truncate text-[10px] font-semibold text-slate-400">{s.code} · {s.batchBn}</p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <RateBadge rate={s.rate} />
                    {s.feeDue > 0
                      ? <span className="text-[11px] font-bold text-red-500">{moneyBn(s.feeDue)} বাকি</span>
                      : <span className="text-[10px] font-bold text-emerald-600">বেতন ক্লিয়ার</span>}
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-slate-300" />
                </button>
              </li>
            ))}
            {!loading && students.length === 0 && (
              <li><EmptyState icon={Users} title="কেউ পাওয়া যায়নি" hint="অন্য কীওয়ার্ড দিয়ে চেষ্টা করুন অথবা ফিল্টার বদলান।" /></li>
            )}
          </ul>
        </div>

        {/* Detail panel */}
        <aside className="card h-fit p-5 lg:sticky lg:top-20 lg:col-span-5">
          {selected ? (
            <>
              <div className="flex items-start gap-4">
                <Avatar name={selected.nameBn} color={selected.avatarColor} size={72} className="text-2xl" />
                <div className="min-w-0">
                  <p className="text-[19px] font-bold leading-6 text-slate-900">{selected.nameBn}</p>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">{selected.name}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <span className="chip border-brand-200 bg-brand-50 text-brand-700">{selected.code}</span>
                    <span className="chip border-slate-200 bg-slate-50 text-slate-500">{selected.batchSubject}</span>
                  </div>
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5"><ShieldCheck size={15} className="shrink-0 text-slate-400" /><span className="min-w-0"><span className="block text-[9px] font-bold uppercase text-slate-400">অভিভাবক</span><span className="font-bold text-slate-700">{selected.guardian || "—"}{selected.guardianPhone ? ` · ${selected.guardianPhone}` : ""}</span></span></div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5"><Phone size={15} className="shrink-0 text-slate-400" /><span className="min-w-0"><span className="block text-[9px] font-bold uppercase text-slate-400">ফোন</span><span className="font-bold text-slate-700">{selected.phone || "—"}</span></span></div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5"><Mail size={15} className="shrink-0 text-slate-400" /><span className="min-w-0"><span className="block text-[9px] font-bold uppercase text-slate-400">ইমেইল</span><span className="truncate font-bold text-slate-700">{selected.email}</span></span></div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5"><BookOpen size={15} className="shrink-0 text-slate-400" /><span className="min-w-0"><span className="block text-[9px] font-bold uppercase text-slate-400">ব্যাচ</span><span className="font-bold text-slate-700">{selected.batchBn}</span></span></div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5"><CalendarDays size={15} className="shrink-0 text-slate-400" /><span className="block"><span className="block text-[9px] font-bold uppercase text-slate-400">ভর্তির তারিখ</span><span className="font-bold text-slate-700">{bnDateShort(selected.joinedAt)}</span></span></div>
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-2.5"><Percent size={15} className="shrink-0 text-slate-400" /><span className="block"><span className="block text-[9px] font-bold uppercase text-slate-400">ছাড়</span><span className="font-bold text-slate-700">{selected.discount > 0 ? moneyBn(selected.discount) : "নেই"}</span></span></div>
              </dl>

              <div className="mt-3 rounded-2xl border border-slate-100 p-3.5">
                <p className="flex items-center justify-between text-[12px] font-bold text-slate-600">
                  <span className="flex items-center gap-1.5"><GraduationCap size={14} /> মোট উপস্থিতি</span>
                  <span className="text-slate-400">{toBn(selected.attended)}/{toBn(selected.totalAtt)} ক্লাস</span>
                </p>
                <div className="mt-1.5"><ProgressBar value={selected.attended} max={Math.max(1, selected.totalAtt)} tone="bg-emerald-500" /></div>
              </div>

              <div className="mt-3 rounded-2xl border border-slate-100 p-3.5">
                <p className="flex items-center justify-between text-[12px] font-bold text-slate-600">
                  <span>এই মাসের বেতন</span><FeeChip status={selected.feeStatus} />
                </p>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <div className="text-[12px] font-semibold text-slate-500">
                    <p>ফি: <span className="text-slate-800">{moneyBn(selected.feeAmount)}</span></p>
                    <p>পরিশোধ: <span className="text-emerald-600">{moneyBn(selected.feePaid)}</span></p>
                    <p>বকেয়া: <span className="text-red-500">{moneyBn(selected.feeDue)}</span></p>
                  </div>
                  <button
                    onClick={() => setCollect({ studentId: selected.id, nameBn: selected.nameBn, name: selected.name, code: selected.code, avatarColor: selected.avatarColor, batchBn: selected.batchBn, due: selected.feeDue })}
                    className="btn-primary h-10 px-4 text-[13px]">
                    <HandCoins size={16} /> সংগ্রহ
                  </button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState icon={GraduationCap} title="একজন শিক্ষার্থী বেছে নিন" hint="বামের তালিকা থেকে যেকোনো শিক্ষার্থীতে ট্যাপ করুন" />
          )}
        </aside>
      </div>

      {/* ── Admission modal ─────────────────────────── */}
      {admitOpen && (
        <AdmitModal batches={batchData?.batches ?? []} onClose={() => setAdmitOpen(false)} onDone={() => { setAdmitOpen(false); refresh(); }} />
      )}
      <CollectModal target={collect} onClose={() => setCollect(null)} onDone={refresh} />
    </div>
  );
}

function AdmitModal({ batches, onClose, onDone }: { batches: Batch[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ nameBn: "", name: "", batchId: "", guardian: "", guardianPhone: "", phone: "", discount: "0" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.nameBn.trim() || !form.batchId) { toast("নাম (বাংলা) ও ব্যাচ দিন"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/students", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, batchId: Number(form.batchId), discount: Number(form.discount || 0) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "ভর্তি করা যায়নি");
      toast(`ভর্তি সম্পন্ন — ${j.code} · ডিফল্ট পাসওয়ার্ড student123`);
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : "ব্যর্থ হয়েছে");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="নতুন ভর্তি">
      <button className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" aria-label="বন্ধ করুন" onClick={onClose} />
      <div className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><UserPlus className="text-brand-600" /> নতুন শিক্ষার্থী ভর্তি</h3>
          <button onClick={onClose} className="icon-btn" aria-label="বন্ধ করুন"><X size={18} /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1"><label className="label">নাম (বাংলা) *</label><input className="input" autoFocus value={form.nameBn} onChange={set("nameBn")} placeholder="রাহিম উদ্দিন" /></div>
          <div className="col-span-2 sm:col-span-1"><label className="label">Name (English)</label><input className="input" value={form.name} onChange={set("name")} placeholder="Rahim Uddin" /></div>
          <div className="col-span-2"><label className="label">ব্যাচ *</label>
            <select className="input" value={form.batchId} onChange={set("batchId") as never}>
              <option value="">ব্যাচ বেছে নিন…</option>
              {batches.map((b) => <option key={b.id} value={b.id}>{b.nameBn}</option>)}
            </select>
          </div>
          <div><label className="label">অভিভাবকের নাম</label><input className="input" value={form.guardian} onChange={set("guardian")} placeholder="করিম উদ্দিন" /></div>
          <div><label className="label">অভিভাবকের ফোন</label><input className="input" inputMode="tel" value={form.guardianPhone} onChange={set("guardianPhone")} placeholder="017…" /></div>
          <div><label className="label">শিক্ষার্থীর ফোন</label><input className="input" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="018…" /></div>
          <div><label className="label">ছাড় (৳/মাস)</label><input className="input" inputMode="numeric" type="number" min={0} value={form.discount} onChange={set("discount")} /></div>
        </div>
        <p className="mt-2 text-[11px] font-medium text-slate-400">ডিফল্ট পাসওয়ার্ড: <b>student123</b> — প্রথম লগইনের পর বদলানো উচিত।</p>
        <button onClick={submit} disabled={saving} className="btn-primary mt-3 h-12 w-full">
          {saving ? <><Loader2 size={17} className="animate-spin" /> ভর্তি হচ্ছে…</> : "ভর্তি সম্পন্ন করুন"}
        </button>
      </div>
    </div>
  );
}

export default function StudentsPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-slate-400">লোড হচ্ছে…</div>}>
      <StudentsInner />
    </Suspense>
  );
}
