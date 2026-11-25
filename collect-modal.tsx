"use client";

import { useEffect, useState } from "react";
import { X, Banknote, Loader2, Smartphone, Wallet, Building2, HandCoins } from "lucide-react";
import { toast } from "./live";
import { Avatar } from "./kit";
import { moneyBn, toBn } from "@/lib/format";

export type CollectTarget = {
  studentId: number;
  nameBn: string;
  name?: string;
  code?: string;
  avatarColor?: string;
  batchBn?: string;
  due?: number;
  month?: string;
};

const METHODS = [
  { id: "bkash", label: "বিকাশ", icon: Smartphone },
  { id: "nagad", label: "নগদ", icon: Smartphone },
  { id: "cash", label: "নগদ (ক্যাশ)", icon: Banknote },
  { id: "bank", label: "ব্যাংক", icon: Building2 },
] as const;

export default function CollectModal({
  target, onClose, onDone,
}: {
  target: CollectTarget | null;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]["id"]>("bkash");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (target) {
      setAmount(target.due && target.due > 0 ? String(target.due) : "");
      setMethod("bkash");
      setSaving(false);
    }
  }, [target]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!target) return null;

  async function submit() {
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value <= 0) { toast("সঠিক পরিমাণ লিখুন"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/fees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: target!.studentId, amount: value, method, month: target!.month }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "সংগ্রহ করা যায়নি");
      toast(`${moneyBn(value)} সংগ্রহ হয়েছে — ${target!.nameBn}`);
      onDone?.();
      onClose();
    } catch (e) {
      toast(e instanceof Error ? e.message : "ব্যর্থ হয়েছে");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="বেতন সংগ্রহ">
      <button className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" aria-label="বন্ধ করুন" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar name={target.nameBn} color={target.avatarColor} size={48} />
            <div>
              <p className="text-[15px] font-bold text-slate-900">{target.nameBn}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {target.code}{target.batchBn ? ` · ${target.batchBn}` : ""}
              </p>
              {target.due != null && target.due > 0 && (
                <p className="mt-0.5 text-[11px] font-bold text-red-500">বকেয়া: {moneyBn(target.due)}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="icon-btn" aria-label="বন্ধ করুন"><X size={18} /></button>
        </div>

        <label className="label mt-5" htmlFor="collect-amount">কত টাকা সংগ্রহ করলেন?</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">৳</span>
          <input
            id="collect-amount" autoFocus inputMode="numeric" type="number" min={1}
            value={amount} onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()}
            className="input h-14 pl-10 text-2xl font-bold tracking-wide"
            placeholder="০"
          />
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {[target.due, 500, 1000, 1500, 2000].filter((v): v is number => !!v && v > 0).slice(0, 4).map((v) => (
            <button key={v} onClick={() => setAmount(String(v))}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-bold text-slate-500 transition hover:border-brand-300 hover:text-brand-700">
              ৳{toBn(v)}
            </button>
          ))}
        </div>

        <label className="label mt-4">পেমেন্ট চ্যানেল</label>
        <div className="grid grid-cols-4 gap-1.5">
          {METHODS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setMethod(id)}
              className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-bold transition ${
                method === id ? "border-brand-500 bg-brand-50 text-brand-700 ring-2 ring-brand-200" : "border-slate-200 text-slate-500 hover:border-slate-300"
              }`}>
              <Icon size={17} />{label}
            </button>
          ))}
        </div>

        <button onClick={submit} disabled={saving} className="btn-primary mt-5 h-12 w-full text-base">
          {saving ? <><Loader2 size={18} className="animate-spin" /> সংগ্রহ হচ্ছে…</> : <><HandCoins size={18} /> সংগ্রহ নিশ্চিত করুন <Wallet size={17} className="opacity-70" /></>}
        </button>
        <p className="mt-2 text-center text-[10px] font-medium text-slate-400">সংগ্রহের তথ্য সাথে সাথে অ্যাডমিন ড্যাশবোর্ডে লাইভ দেখা যাবে</p>
      </div>
    </div>
  );
}
