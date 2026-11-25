"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  Eye, EyeOff, GraduationCap, Lock, Mail, ShieldCheck, Users, Wallet,
  CalendarCheck, Video, Loader2, Radio, Sparkles,
} from "lucide-react";

const DEMO = [
  { label: "অ্যাডমিন", email: "admin@coaching.com", password: "admin123", tone: "bg-slate-900" },
  { label: "শিক্ষক (গণিত)", email: "rakib@coaching.com", password: "teacher123", tone: "bg-brand-600" },
  { label: "শিক্ষার্থী", email: "stu2401@student.coaching.com", password: "student123", tone: "bg-emerald-600" },
];

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j?.error || "ইমেইল বা পাসওয়ার্ড ভুল হয়েছে");
      const next = search.get("next");
      const home = j.user?.role === "admin" ? "/admin" : j.user?.role === "teacher" ? "/teacher" : "/student";
      router.replace(next && next.startsWith("/") ? next : home);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "লগইন করা যায়নি, আবার চেষ্টা করুন");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-stretch bg-[#f3f5fa]">
      {/* ── Left: brand panel ─────────────────────────── */}
      <div className="relative hidden w-[46%] flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-800 via-brand-700 to-[#1b2f63] p-10 text-white lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-cyan-400/10 blur-3xl"
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/20 backdrop-blur">
            <GraduationCap size={26} strokeWidth={2.2} />
          </span>
          <div>
            <p className="text-xl font-bold leading-tight">কোচিং ম্যানেজার</p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-200">Adorsha Academy</p>
          </div>
        </div>

        <div className="relative">
          <h1 className="max-w-md text-[2.6rem] font-bold leading-[1.18]">
            সব হিসেব<br />
            <span className="text-brand-200">এক জায়গায়</span>
          </h1>
          <p className="mt-3 max-w-sm text-[15px] font-medium leading-relaxed text-brand-100/90">
            উপস্থিতি, ক্লাস লিংক, বেতন, রিপোর্ট — শিক্ষক, শিক্ষার্থী ও অ্যাডমিনের স্ক্রিনে একই সিগারে একই মুহূর্তে।
          </p>

          <div className="relative mt-6 overflow-hidden rounded-3xl border border-white/15 shadow-2xl">
            <Image src="/images/login-hero.png" alt="আদর্শ একাডেমীতে অনলাইন ক্লাস" width={640} height={420} priority className="h-52 w-full object-cover" />
          </div>

          <ul className="relative mt-6 grid max-w-md grid-cols-2 gap-2 text-[13px] font-semibold text-brand-100">
            {[
              { icon: Radio, t: "লাইভ সিঙ্ক — রিফ্রেশ লাগে না" },
              { icon: Video, t: "Meet/Zoom লিংক এক ট্যাপে জয়েন" },
              { icon: CalendarCheck, t: "মাসিক উপস্থিতি ক্যালেন্ডার" },
              { icon: Wallet, t: "বেতন-বকেয়া স্বয়ংক্রিয় হিসাব" },
            ].map(({ icon: Icon, t }) => (
              <li key={t} className="flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 ring-1 ring-white/10">
                <Icon size={15} className="shrink-0 text-emerald-300" /> {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-[11px] font-medium text-brand-200/70">
          আদর্শ একাডেমী · ধানমন্ডি, ঢাকা · মোবাইল-ফার্স্ট · স্বল্প ডাটা খরচেই চলে
        </p>
      </div>

      {/* ── Right: sign-in card ───────────────────────── */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg">
              <GraduationCap size={30} />
            </span>
            <h1 className="text-2xl font-bold text-slate-900">কোচিং ম্যানেজার</h1>
            <p className="text-xs font-semibold text-slate-500">আদর্শ একাডেমী — সব হিসেব এক জায়গায়</p>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-brand-600" />
              <h2 className="text-xl font-bold text-slate-900">সাইন ইন করুন</h2>
            </div>
            <p className="mt-1 text-[13px] font-medium text-slate-500">
              নিজের ভূমিকা অনুযায়ী ড্যাশবোর্ড খুলবে — অ্যাডমিন, শিক্ষক বা শিক্ষার্থী।
            </p>

            <form onSubmit={submit} className="mt-5 space-y-4">
              <div>
                <label className="label" htmlFor="email">ইমেইল / Email</label>
                <div className="relative">
                  <Mail size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="email" type="email" required autoComplete="email" value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@coaching.com"
                    className="input pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="label" htmlFor="password">পাসওয়ার্ড / Password</label>
                <div className="relative">
                  <Lock size={17} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="password" type={show ? "text" : "password"} required autoComplete="current-password"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input pl-10 pr-12"
                  />
                  <button type="button" onClick={() => setShow((s) => !s)}
                    aria-label={show ? "পাসওয়ার্ড লুকান" : "পাসওয়ার্ড দেখুন"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700">
                    {show ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] font-semibold text-red-600">
                  {error}
                </p>
              )}

              <button type="submit" disabled={loading} className="btn-primary h-12 w-full text-base">
                {loading ? <><Loader2 size={18} className="animate-spin" /> সাইন ইন হচ্ছে…</> : "সাইন ইন করুন →"}
              </button>
            </form>

            <div className="mt-5 border-t border-dashed border-slate-200 pt-4">
              <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <ShieldCheck size={13} /> ডেমো অ্যাকাউন্ট — এক ট্যাপে ফিল করুন
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO.map((d) => (
                  <button
                    key={d.email}
                    type="button"
                    onClick={() => { setEmail(d.email); setPassword(d.password); setError(null); }}
                    className={`chip ${d.tone} border-transparent text-white hover:opacity-90`}
                  >
                    {d.label}
                  </button>
                ))}
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                  <Users size={12} /> পাসওয়ার্ড: admin123 / teacher123 / student123
                </span>
              </div>
            </div>
          </div>

          <p className="mt-4 text-center text-[11px] font-medium text-slate-400">
            সমস্যা হলে অফিস দপ্তরে যোগাযোগ করুন · 01711-005001
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-dvh items-center justify-center"><Loader2 className="animate-spin text-brand-600" size={32} /></div>}>
      <LoginForm />
    </Suspense>
  );
}
