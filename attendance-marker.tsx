"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, X, Users, Save, BadgeCheck, PartyPopper } from "lucide-react";
import { useLiveData, toast, Skeleton } from "./live";
import { Avatar, ProgressBar } from "./kit";
import { toBn, todayLocal } from "@/lib/format";

type RosterRow = {
  studentId: number; code: string; name: string; nameBn: string;
  phone: string; batchBn: string; avatarColor: string;
  status: "present" | "late" | "absent" | null;
};
type RosterResponse = {
  date: string; batchId: number; sessionsHeld: number;
  roster: RosterRow[];
  counts: { present: number; late: number; absent: number };
};

export default function AttendanceMarker({
  batches, showCompleteClass = false, compact = false, batchId: controlledId, onBatchChange,
}: {
  batches: Array<{ id: number; nameBn: string; studentCount?: number }>;
  showCompleteClass?: boolean;
  compact?: boolean;
  batchId?: number | null;
  onBatchChange?: (id: number) => void;
}) {
  const [internalId, setInternalId] = useState<number>(batches[0]?.id ?? 0);
  const batchId = controlledId ?? internalId ?? batches[0]?.id ?? 0;
  const [date, setDate] = useState(todayLocal());
  const [marks, setMarks] = useState<Record<number, RosterRow["status"] | "">>({});
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [classTitle, setClassTitle] = useState("নিয়মিত ক্লাস");
  const [duration, setDuration] = useState(75);
  const initFor = useRef("");

  // keep uncontrolled selection valid as batches arrive async
  useEffect(() => {
    if (!controlledId && !internalId && batches[0]?.id) setInternalId(batches[0].id);
  }, [batches, controlledId, internalId]);

  const { data, loading, refresh } = useLiveData<RosterResponse>(
    batchId ? `/api/attendance?batchId=${batchId}&date=${date}` : null
  );
  const key = `${batchId}|${date}`;

  useEffect(() => {
    if (data?.roster && initFor.current !== key) {
      const next: Record<number, RosterRow["status"] | ""> = {};
      for (const r of data.roster) next[r.studentId] = r.status ?? "";
      setMarks(next);
      setDirty(false);
      initFor.current = key;
    }
  }, [data, key]);

  const counts = useMemo(() => {
    let present = 0, late = 0, absent = 0, unset = 0;
    for (const v of Object.values(marks)) {
      if (v === "present") present++;
      else if (v === "late") late++;
      else if (v === "absent") absent++;
      else unset++;
    }
    return { present, late, absent, unset };
  }, [marks]);

  function selectBatch(id: number) {
    if (onBatchChange) onBatchChange(id);
    else setInternalId(id);
    initFor.current = "";
  }

  function setAll(status: RosterRow["status"]) {
    const next: Record<number, RosterRow["status"]> = {};
    for (const r of data?.roster ?? []) next[r.studentId] = status;
    setMarks(next);
    setDirty(true);
  }

  async function save() {
    const payload = Object.entries(marks)
      .filter(([, v]) => v)
      .map(([studentId, status]) => ({ studentId: Number(studentId), status }));
    if (!payload.length) { toast("কাউকে উপস্থিত হিসেবে মার্ক করা হয়নি"); return; }
    setSaving(true);
    try {
      const r = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId, date, marks: payload }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "সেভ করা যায়নি");
      toast(`উপস্থিতি সেভ হয়েছে — ${toBn(payload.length)} জন · সবার স্ক্রিনে লাইভ দেখা যাবে`);
      setDirty(false);
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "সেভ ব্যর্থ হয়েছে");
    } finally {
      setSaving(false);
    }
  }

  async function completeClass() {
    setCompleting(true);
    try {
      const r = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "complete_class", batchId, date, title: classTitle, durationMin: duration }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "ক্লাস সম্পন্ন করা যায়নি");
      toast("ক্লাস সম্পন্ন হিসেবে যোগ হয়েছে — রিপোর্টে গণনা হবে");
      refresh();
    } catch (e) {
      toast(e instanceof Error ? e.message : "ব্যর্থ হয়েছে");
    } finally {
      setCompleting(false);
    }
  }

  const roster = data?.roster ?? [];

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Users size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <select value={batchId} onChange={(e) => selectBatch(Number(e.target.value))}
            className="input h-10 w-56 pl-9 text-[13px]" aria-label="ব্যাচ নির্বাচন">
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.nameBn}{b.studentCount != null ? ` · ${toBn(b.studentCount)} জন` : ""}</option>
            ))}
          </select>
        </div>
        <input type="date" value={date} onChange={(e) => { setDate(e.target.value); initFor.current = ""; }}
          className="input h-10 w-40 text-[13px]" aria-label="তারিখ" />
        <button onClick={() => setAll("present")} className="btn-ghost h-10 px-3 text-[12px]">
          <Check size={15} className="text-emerald-600" /> সবাই উপস্থিত
        </button>
      </div>

      {/* Progress strip */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] font-bold">
        <span className="chip border-emerald-200 bg-emerald-50 text-emerald-700">উপস্থিত {toBn(counts.present)}</span>
        <span className="chip border-amber-200 bg-amber-50 text-amber-700">দেরি {toBn(counts.late)}</span>
        <span className="chip border-red-200 bg-red-50 text-red-600">অনুপস্থিত {toBn(counts.absent)}</span>
        <span className="chip border-slate-200 bg-slate-50 text-slate-500">বাকি {toBn(counts.unset)}</span>
        <div className="min-w-32 flex-1"><ProgressBar value={roster.length - counts.unset} max={Math.max(1, roster.length)} tone="bg-emerald-500" /></div>
      </div>

      {/* Roster */}
      <div className={`nice-scroll mt-3 overflow-y-auto ${compact ? "max-h-[430px]" : "max-h-[560px]"}`}>
        {loading && roster.length === 0 ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : roster.length === 0 ? (
          <p className="py-6 text-center text-[13px] font-medium text-slate-400">এই ব্যাচে কোনো শিক্ষার্থী নেই।</p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-100">
            {roster.map((r) => {
              const cur = marks[r.studentId];
              const btn = (status: "present" | "late" | "absent", active: string, Icon: typeof Check, label: string) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => { setMarks((m) => ({ ...m, [r.studentId]: m[r.studentId] === status ? "" : status })); setDirty(true); }}
                  aria-pressed={cur === status}
                  aria-label={`${r.nameBn} — ${label}`}
                  className={`flex h-9 w-9 items-center justify-center rounded-xl border transition sm:h-9 sm:w-11 ${
                    cur === status ? active : "border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600"
                  }`}
                >
                  <Icon size={17} strokeWidth={2.5} />
                </button>
              );
              return (
                <li key={r.studentId} className="flex items-center gap-2.5 bg-white px-2.5 py-2 transition hover:bg-slate-50/60">
                  <Avatar name={r.nameBn} color={r.avatarColor} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-800">{r.nameBn}</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{r.code}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {btn("present", "border-emerald-500 bg-emerald-500 text-white shadow-sm", Check, "উপস্থিত")}
                    {btn("late", "border-amber-400 bg-amber-400 text-white shadow-sm", Clock3, "দেরিতে")}
                    {btn("absent", "border-red-500 bg-red-500 text-white shadow-sm", X, "অনুপস্থিত")}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Save bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-slate-400">
          মোট ক্লাস অনুষ্ঠিত (এই ব্যাচে): <span className="font-bold text-slate-600">{toBn(data?.sessionsHeld ?? 0)}</span>
        </p>
        <button onClick={save} disabled={saving || !dirty} className="btn-primary h-10 text-[13px]">
          {saving ? "সেভ হচ্ছে…" : <><Save size={15} /> উপস্থিতি সেভ করুন</>}
        </button>
      </div>

      {/* Class complete */}
      {showCompleteClass && (
        <div className="mt-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-3">
          <p className="flex items-center gap-1.5 text-[12px] font-bold text-emerald-800">
            <BadgeCheck size={16} /> আজকের ক্লাস সম্পন্ন হলে
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input value={classTitle} onChange={(e) => setClassTitle(e.target.value)}
              className="input h-10 min-w-40 flex-1 text-[13px]" placeholder="ক্লাসের বিষয়, যেমন: নিউটনের গতিসূত্র" />
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="input h-10 w-24 text-[13px]" aria-label="সময়কাল">
              {[45, 60, 75, 90, 120].map((d) => <option key={d} value={d}>{toBn(d)} মিনিট</option>)}
            </select>
            <button onClick={completeClass} disabled={completing} className="btn-green h-10 text-[13px]">
              {completing ? "যোগ হচ্ছে…" : <><PartyPopper size={15} /> ক্লাস সম্পন্ন</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
