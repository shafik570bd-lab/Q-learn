"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Layers, Plus, X, Loader2, Users, Presentation, Clock3, DoorOpen,
  Wallet, CalendarCheck2, ChevronRight, GraduationCap, UserRound,
} from "lucide-react";
import { useLiveData, toast, Skeleton } from "@/components/live";
import { RateBadge, ProgressBar } from "@/components/kit";
import { toBn, moneyBn } from "@/lib/format";

type Batch = {
  id: number; nameBn: string; name: string; subject: string; schedule: string; room: string;
  monthlyFee: number; capacity: number; status: string; teacherId: number; teacherBn: string; teacherColor: string;
  studentCount: number; presentToday: number; rate: number | null;
};
type Teacher = { id: number; nameBn: string; subject: string };

export default function BatchesPage() {
  const { data, loading, refresh } = useLiveData<{ batches: Batch[]; teachers: Teacher[] }>("/api/batches");
  const [modalOpen, setModalOpen] = useState(false);

  const batches = data?.batches ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13px] font-semibold text-slate-500">
          {loading ? "লোড হচ্ছে…" : <>{toBn(batches.length)} টি সক্রিয় ব্যাচ · মোট {toBn(batches.reduce((a, b) => a + b.studentCount, 0))} জন শিক্ষার্থী</>}
        </p>
        <button onClick={() => setModalOpen(true)} className="btn-primary"><Plus size={17} /> নতুন ব্যাচ</button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading && batches.length === 0 && Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-56" />)}
        {batches.map((b) => {
          const occupancy = Math.min(100, Math.round((b.studentCount / Math.max(1, b.capacity)) * 100));
          return (
            <article key={b.id} className="card flex flex-col p-5 transition hover:shadow-[0_2px_6px_rgb(16_24_40/0.08),0_24px_48px_-20px_rgb(47_95_224/0.4)]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-brand-600"><Layers size={12} /> {b.subject}</p>
                  <h2 className="mt-0.5 text-[17px] font-bold leading-6 text-slate-900">{b.nameBn}</h2>
                </div>
                <RateBadge rate={b.rate} />
              </div>

              <ul className="mt-3 space-y-1.5 text-[12px] font-medium text-slate-500">
                <li className="flex items-center gap-2"><UserRound size={14} className="shrink-0 text-slate-400" /><span className="truncate">{b.teacherBn}</span></li>
                <li className="flex items-center gap-2"><Clock3 size={14} className="shrink-0 text-slate-400" /><span className="truncate">{b.schedule || "রুটিন সেট হয়নি"}</span></li>
                <li className="flex items-center gap-2"><DoorOpen size={14} className="shrink-0 text-slate-400" />{b.room || "রুম টিবিডি"} · <Wallet size={13} className="inline text-slate-400" /> {moneyBn(b.monthlyFee)}/মাস</li>
              </ul>

              <div className="mt-3">
                <p className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span className="flex items-center gap-1"><Users size={12} /> {toBn(b.studentCount)}/{toBn(b.capacity)} জন</span>
                  <span>{toBn(occupancy)}% ভর্তি</span>
                </p>
                <div className="mt-1"><ProgressBar value={b.studentCount} max={b.capacity} tone={occupancy >= 90 ? "bg-amber-500" : "bg-brand-600"} /></div>
              </div>

              <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-slate-200 pt-3">
                <p className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-700">
                  <CalendarCheck2 size={15} /> আজ {toBn(b.presentToday)} জন হাজির
                </p>
                <Link href={`/admin/students?batchId=${b.id}`}
                  className="inline-flex items-center gap-0.5 text-[12px] font-bold text-brand-700 hover:underline">
                  তালিকা <ChevronRight size={14} />
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      {modalOpen && <NewBatchModal teachers={data?.teachers ?? []} onClose={() => setModalOpen(false)} onDone={() => { setModalOpen(false); refresh(); }} />}
    </div>
  );
}

function NewBatchModal({ teachers, onClose, onDone }: { teachers: Teacher[]; onClose: () => void; onDone: () => void }) {
  const [form, setForm] = useState({ nameBn: "", subject: "", schedule: "", room: "", teacherId: "", monthlyFee: "1500", capacity: "40" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm({ ...form, [k]: e.target.value });

  async function submit() {
    if (!form.nameBn.trim() || !form.subject.trim() || !form.teacherId) { toast("ব্যাচের নাম, বিষয় ও শিক্ষক আবশ্যক"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/batches", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, teacherId: Number(form.teacherId), monthlyFee: Number(form.monthlyFee), capacity: Number(form.capacity) }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "ব্যাচ খোলা যায়নি");
      toast("নতুন ব্যাচ যোগ হয়েছে — সবার স্ক্রিনেই লাইভ");
      onDone();
    } catch (e) {
      toast(e instanceof Error ? e.message : "ব্যর্থ হয়েছে");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="নতুন ব্যাচ">
      <button className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" aria-label="বন্ধ করুন" onClick={onClose} />
      <div className="relative max-h-[94dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900"><Presentation className="text-brand-600" /> নতুন ব্যাচ খুলুন</h3>
          <button onClick={onClose} className="icon-btn" aria-label="বন্ধ করুন"><X size={18} /></button>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="col-span-2"><label className="label">ব্যাচের নাম (বাংলা) *</label><input className="input" autoFocus value={form.nameBn} onChange={set("nameBn")} placeholder="HSC বিজ্ঞান — জীববিজ্ঞান" /></div>
          <div className="col-span-2 sm:col-span-1"><label className="label">বিষয় *</label><input className="input" value={form.subject} onChange={set("subject")} placeholder="জীববিজ্ঞান" /></div>
          <div className="col-span-2 sm:col-span-1"><label className="label">রুম</label><input className="input" value={form.room} onChange={set("room")} placeholder="রুম ৭" /></div>
          <div className="col-span-2"><label className="label">সময়সূচি</label><input className="input" value={form.schedule} onChange={set("schedule")} placeholder="শনি · সোম · বুধ — সন্ধ্যা ৬:০০" /></div>
          <div className="col-span-2"><label className="label">দায়িত্বপ্রাপ্ত শিক্ষক *</label>
            <select className="input" value={form.teacherId} onChange={set("teacherId") as never}>
              <option value="">শিক্ষক বেছে নিন…</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.nameBn} — {t.subject}</option>)}
            </select>
          </div>
          <div><label className="label">মাসিক ফি (৳)</label><input className="input" type="number" min={0} inputMode="numeric" value={form.monthlyFee} onChange={set("monthlyFee")} /></div>
          <div><label className="label">ধারণক্ষমতা</label><input className="input" type="number" min={1} inputMode="numeric" value={form.capacity} onChange={set("capacity")} /></div>
        </div>
        <button onClick={submit} disabled={saving} className="btn-primary mt-4 h-12 w-full">
          {saving ? <><Loader2 size={17} className="animate-spin" /> তৈরি হচ্ছে…</> : <><GraduationCap size={18} /> ব্যাচ তৈরি করুন</>}
        </button>
      </div>
    </div>
  );
}
