"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Megaphone, Video, StickyNote, Trash2, Pin, Send, Link2, Type,
  Users, ClipboardCheck, CalendarCheck2, BookOpenCheck, AlertTriangle,
  GraduationCap, Loader2, Radio,
} from "lucide-react";
import { useLiveData, toast, Skeleton } from "@/components/live";
import { SectionTitle, Avatar, EmptyState } from "@/components/kit";
import AttendanceMarker from "@/components/attendance-marker";
import { toBn, todayLocal, timeAgo, bnDateShort } from "@/lib/format";

type TeacherBundle = {
  today: string;
  batches: Array<{ id: number; nameBn: string; subject: string; schedule: string; room: string; monthlyFee: number; capacity: number; studentCount: number; presentToday: number; markedToday: number }>;
  stats: { totalStudents: number; batchCount: number; todayPresent: number; todayMarked: number; monthClasses: number };
  lowAttendance: Array<{ code: string; name: string; nameBn: string; avatarColor: string; attended: number; total: number; rate: number }>;
};
type Post = {
  id: number; kind: "meet" | "note"; meetUrl: string; message: string; pinned: boolean;
  batchId: number; studentId: number | null; createdAt: string; teacherBn: string; batchBn: string;
};

const QUICK_NOTES = [
  "আজ সন্ধ্যায় অনলাইন ক্লাস — লিংকে টাপ করে জয়েন করুন",
  "আগামীকাল মডেল টেস্ট — সিলেবাস অনুযায়ী প্রস্তুত হোন",
  "অধ্যায় শেষ করে ক্লাসে আসুন, লাস্ট ১০ মিনিটে ক্যুইজ",
];

export default function TeacherPage() {
  const [batchId, setBatchId] = useState<number | null>(null);
  const { data: bundle, loading: bundleLoading } = useLiveData<TeacherBundle>("/api/teacher");
  const [meetUrl, setMeetUrl] = useState("");
  const [message, setMessage] = useState("");
  const [pinned, setPinned] = useState(true);
  const [target, setTarget] = useState<"batch" | string>("batch");
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    if (bundle?.batches?.length && batchId === null) setBatchId(bundle.batches[0].id);
  }, [bundle, batchId]);

  const selectedBatch = bundle?.batches.find((b) => b.id === batchId) ?? null;
  const postsUrl = batchId ? `/api/notes?batchId=${batchId}&limit=12` : null;
  const { data: postsData, refresh: refreshPosts } = useLiveData<{ posts: Post[] }>(postsUrl);
  const rosterUrl = batchId ? `/api/attendance?batchId=${batchId}&date=${todayLocal()}` : null;
  const { data: rosterData } = useLiveData<{ roster: Array<{ studentId: number; nameBn: string; code: string }> }>(rosterUrl);

  const posts = useMemo(
    () => [...(postsData?.posts ?? [])].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt)),
    [postsData]
  );

  async function publishPost() {
    if (!batchId) return;
    if (!meetUrl.trim() && !message.trim()) { toast("Meet/Zoom লিংক অথবা বার্তা — কিছু একটা লিখুন"); return; }
    setPublishing(true);
    try {
      const r = await fetch("/api/notes", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId, meetUrl: meetUrl.trim(), message: message.trim(), pinned,
          studentId: target === "batch" ? null : Number(target),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "পাবলিশ করা যায়নি");
      toast(meetUrl.trim() ? "ক্লাস লিংক পাঠানো হয়েছে — শিক্ষার্থীরা এখনই দেখছে!" : "নোটিশ পাঠানো হয়েছে");
      setMeetUrl(""); setMessage(""); setTarget("batch");
      refreshPosts();
    } catch (e) {
      toast(e instanceof Error ? e.message : "ব্যর্থ হয়েছে");
    } finally {
      setPublishing(false);
    }
  }

  async function removePost(id: number) {
    const r = await fetch(`/api/notes?id=${id}`, { method: "DELETE" });
    if (r.ok) { toast("পোস্ট মুছে ফেলা হয়েছে"); refreshPosts(); } else { toast("মুছতে সমস্যা হয়েছে"); }
  }

  return (
    <div className="space-y-4">
      {/* ── Stat strip ───────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { icon: GraduationCap, label: "আমার ব্যাচ", value: toBn(bundle?.stats.batchCount ?? 0), tone: "text-brand-600 bg-brand-50" },
          { icon: Users, label: "মোট শিক্ষার্থী", value: toBn(bundle?.stats.totalStudents ?? 0), tone: "text-violet-600 bg-violet-50" },
          { icon: ClipboardCheck, label: "আজ উপস্থিত", value: `${toBn(bundle?.stats.todayPresent ?? 0)}/${toBn(bundle?.stats.todayMarked ?? 0)}`, tone: "text-emerald-600 bg-emerald-50" },
          { icon: BookOpenCheck, label: "এইমাসে ক্লাস", value: toBn(bundle?.stats.monthClasses ?? 0), tone: "text-amber-600 bg-amber-50" },
        ].map(({ icon: Icon, label, value, tone }) => (
          <div key={label} className="card flex items-center gap-3 p-4">
            <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon size={24} /></span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
              <p className="text-[22px] font-bold leading-6 text-slate-900">{bundleLoading && !bundle ? "…" : value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Batch switcher ───────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 nice-scroll" role="tablist" aria-label="ব্যাচ নির্বাচন">
        {(bundle?.batches ?? []).map((b) => (
          <button key={b.id} role="tab" aria-selected={batchId === b.id} onClick={() => { setBatchId(b.id); setTarget("batch"); }}
            className={`flex shrink-0 items-center gap-2 rounded-2xl border px-4 py-2.5 text-left transition ${
              batchId === b.id ? "border-brand-600 bg-brand-600 text-white shadow-lg" : "border-slate-200 bg-white text-slate-600 hover:border-brand-300"
            }`}>
            <span>
              <span className="block whitespace-nowrap text-[13px] font-bold">{b.nameBn}</span>
              <span className={`block whitespace-nowrap text-[9px] font-semibold uppercase tracking-wide ${batchId === b.id ? "text-brand-100" : "text-slate-400"}`}>
                {toBn(b.studentCount)} জন · {b.schedule.split("—")[1]?.trim() ?? b.schedule}
              </span>
            </span>
          </button>
        ))}
        {bundleLoading && !bundle && <Skeleton className="h-14 w-64" />}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {/* ── Roster + class complete ─────────────────── */}
        <section id="roster" className="card scroll-mt-24 p-5 xl:col-span-3">
          <SectionTitle dot="bg-emerald-500" title="আজকের উপস্থিতি ও ক্লাস" en="Roster & class"
            right={<span className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400"><Radio size={12} className="text-emerald-500" /> লাইভ</span>} />
          {selectedBatch ? (
            <AttendanceMarker batches={bundle?.batches ?? []} showCompleteClass compact
              batchId={batchId} onBatchChange={(id) => { setBatchId(id); setTarget("batch"); }} />
          ) : (
            <Skeleton className="h-72" />
          )}
        </section>

        {/* ── Publish panel + feed ────────────────────── */}
        <div className="space-y-4 xl:col-span-2">
          <section id="publish" className="card scroll-mt-24 border-brand-200 p-5 ring-1 ring-brand-100">
            <SectionTitle dot="bg-brand-600" title="লাইভ ক্লাস লিংক ও নোটিশ" en="Publish to students" />
            <div className="space-y-3">
              <div>
                <label className="label" htmlFor="meet-url">Google Meet / Zoom লিংক</label>
                <div className="relative">
                  <Link2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input id="meet-url" inputMode="url" value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)}
                    placeholder="https://meet.google.com/abc-defg-hij" className="input pl-10 text-[13px]" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="note-msg">বার্তা / নির্দেশনা</label>
                <div className="relative">
                  <Type size={16} className="pointer-events-none absolute left-3.5 top-3.5 text-slate-400" />
                  <textarea id="note-msg" value={message} onChange={(e) => setMessage(e.target.value)}
                    placeholder="যেমন: আজকের ক্লাসে নিউটনের গতিসূত্র — বোর্ড বই পাতা ৫৬–৬১ পড়ে এসো…"
                    className="input min-h-24 py-3 pl-10 leading-relaxed" rows={3} />
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {QUICK_NOTES.map((t) => (
                    <button key={t} onClick={() => setMessage(t)}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-500 transition hover:border-brand-300 hover:text-brand-700">
                      {t.slice(0, 38)}…
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={target} onChange={(e) => setTarget(e.target.value)} className="input h-10 w-auto min-w-40 text-[13px]" aria-label="কাকে পাঠাবেন">
                  <option value="batch">পুরো ব্যাচকে ({selectedBatch ? toBn(selectedBatch.studentCount) : "…"} জন)</option>
                  {(rosterData?.roster ?? []).map((s) => <option key={s.studentId} value={String(s.studentId)}>শুধু {s.nameBn} ({s.code})</option>)}
                </select>
                <label className="flex h-10 cursor-pointer select-none items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-600 transition hover:border-brand-300">
                  <input type="checkbox" className="h-4 w-4 accent-[#2f5fe0]" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
                  <Pin size={13} /> পিন রাখুন
                </label>
              </div>
              <button onClick={publishPost} disabled={publishing} className="btn-primary h-12 w-full text-base">
                {publishing ? <><Loader2 size={18} className="animate-spin" /> পাঠানো হচ্ছে…</> : <><Send size={18} /> পাবলিশ — সবার স্ক্রিনে লাইভ যাবে</>}
              </button>
            </div>
          </section>

          <section id="posts" className="card scroll-mt-24 p-5">
            <SectionTitle dot="bg-amber-500" title="প্রকাশিত পোস্ট" en="Recent posts"
              right={<span className="text-[11px] font-bold text-slate-400">{toBn(posts.length)} টি · {selectedBatch?.nameBn}</span>} />
            <ul className="nice-scroll max-h-80 space-y-2 overflow-y-auto">
              {posts.map((p) => (
                <li key={p.id} className="rounded-2xl border border-slate-100 p-3 transition hover:border-slate-200">
                  <div className="flex items-start gap-2.5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${p.kind === "meet" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>
                      {p.kind === "meet" ? <Video size={17} /> : <StickyNote size={17} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {p.pinned && <Pin size={10} className="text-brand-500" />}
                        {p.kind === "meet" ? "ক্লাস লিংক" : "নোটিশ"} · {timeAgo(p.createdAt)}
                        {p.studentId ? <span className="chip border-violet-200 bg-violet-50 text-violet-600">ব্যক্তিগত</span> : null}
                      </p>
                      {p.message && <p className="mt-1 text-[12px] font-medium leading-snug text-slate-700">{p.message}</p>}
                      {p.meetUrl && (
                        <a href={p.meetUrl} target="_blank" rel="noreferrer" className="mt-1 block truncate text-[11px] font-bold text-brand-700 hover:underline">{p.meetUrl}</a>
                      )}
                    </div>
                    <button onClick={() => removePost(p.id)} aria-label="মুছুন" className="rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
              {posts.length === 0 && <li><EmptyState icon={Megaphone} title="এখনো কিছু প্রকাশিত হয়নি" hint="উপরের ফর্ম থেকে প্রথম ক্লাস লিংক বা নোটিশ পাঠিয়ে দিন।" /></li>}
            </ul>
          </section>
        </div>
      </div>

      {/* ── Low attendance watchlist ─────────────────── */}
      {(bundle?.lowAttendance?.length ?? 0) > 0 && (
        <section className="card border-amber-200 bg-gradient-to-r from-amber-50 to-white p-5">
          <SectionTitle dot="bg-amber-500" title="কম উপস্থিতির শিক্ষার্থী" en="Watchlist" />
          <div className="flex flex-wrap gap-2">
            {bundle!.lowAttendance.map((s) => (
              <div key={s.code} className="flex items-center gap-2.5 rounded-2xl border border-amber-200 bg-white px-3 py-2">
                <Avatar name={s.nameBn} color={s.avatarColor} size={34} />
                <div>
                  <p className="flex items-center gap-1 text-[12px] font-bold text-slate-800"><AlertTriangle size={11} className="text-amber-500" />{s.nameBn}</p>
                  <p className="text-[9px] font-semibold text-slate-400">{s.code} · {toBn(s.rate)}% ({toBn(s.attended)}/{toBn(s.total)})</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] font-semibold text-amber-800/80">অভিভাবককে ফোন করে (01711-005001 দিয়ে অফিসের মাধ্যমে) জানানোর পরামর্শ দেওয়া হলো।</p>
        </section>
      )}
      <p className="text-center text-[10px] font-medium text-slate-400">{bnDateShort(todayLocal())} · আজকের যেকোনো পরিবর্তন সবার স্ক্রিনে তৎক্ষণাৎ দেখা যাবে</p>
    </div>
  );
}
