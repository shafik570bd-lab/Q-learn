"use client";

import {
  Smartphone, Globe, Wrench, Zap, CheckCircle2, Share2, AlertTriangle,
  ExternalLink, Package, RefreshCw, Printer, ChevronRight,
} from "lucide-react";
import { SectionTitle } from "@/components/kit";
import { toBn } from "@/lib/format";

const OPTIONS = [
  {
    icon: Zap,
    tag: "সবচেয়ে দ্রুত",
    title: "Option A — PWABuilder",
    subtitle: "pwabuilder.com · ৫ মিনিটে APK",
    tone: "border-emerald-200 bg-emerald-50/50",
    iconTone: "bg-emerald-500",
    steps: [
      "অ্যাপটি লাইভ HTTPS URL-এ ডিপ্লয় করুন (Vercel / Netlify / Firebase Hosting)।",
      "pwabuilder.com এ গিয়ে আপনার URL পেস্ট করে “Start” চাপুন।",
      "স্কোরকার্ডে “Android” প্যাকেজ বেছে “Generate Package” ক্লিক করুন।",
      "ডাউনলোড হওয়া .apk (বা .aab + signing key) টেকনিশিয়ান ছাড়াই ইনস্টল করুন।",
    ],
    note: "এই অ্যাপে manifest.json ও SVG আইকন ইতোমধ্যে যুক্ত আছে — তাই PWA স্কোর এমনিতেই ভালো আসবে।",
  },
  {
    icon: Wrench,
    tag: "সবচেয়ে শক্তিশালী",
    title: "Option B — Capacitor",
    subtitle: "Native Android control · Android Studio",
    tone: "border-brand-200 bg-brand-50/50",
    iconTone: "bg-brand-600",
    steps: [
      "লোকাল মেশিনে কোড পুল করে nvm/npm দিয়ে ডিপেন্ডেন্সি ইন্সটল করুন।",
      "npm i @capacitor/core @capacitor/cli @capacitor/android অতঃপর npx cap init করে appId (যেমন com.adarsha.coaching) সেট করুন।",
      "capacitor.config-এ server.url-এ আপনার লাইভ HTTPS URL বসান — অথবা npx cap sync দিয়ে bundled build দিন।",
      "npx cap add android → npx cap open android → Android Studio-তে Build → Build APK(s)।",
    ],
    note: "Back-button, status bar, স্প্ল্যাশ স্ক্রিন ও গভীর লিংক নিজে থেকে কনট্রোল করা যায়।",
  },
  {
    icon: Globe,
    tag: "সবচেয়ে সহজ",
    title: "Option C — WebView Wrapper",
    subtitle: "অনলাইন URL→APK টুলস · টেস্টিং-এর জন্য",
    tone: "border-amber-200 bg-amber-50/50",
    iconTone: "bg-amber-500",
    steps: [
      "যেকোনো অনলাইন “WebView to APK” জেনারেটর বেছে আপনার লাইভ URL দিন।",
      "অ্যাপের নাম, আইকন ও প্যাকেজ আইডি সেট করুন।",
      "ডাউনলোড করা APK WhatsApp/Drive-এ শেয়ার করুন।",
    ],
    note: "আইকন ও ব্যাক-বাটন বিহেভিয়ারের উপর নিয়ন্ত্রণ কম — ছোট গ্রুপ বা টেস্টিং-এ চলবে।",
  },
] as const;

const DISTRIBUTION_STEPS = [
  { n: 1, t: "APK ফাইলটি WhatsApp, টেলিগ্রাম বা Google Drive লিংকে শেয়ার করুন।" },
  { n: 2, t: "প্রথম ইনস্টলে Android “Install unknown apps” / “Unknown sources” অনুমতি চাইবে — WhatsApp বা ফাইল ম্যানেজারকে অনুমতি দিন।" },
  { n: 3, t: "প্রতিটি নতুন ফিচার পুশ করলে APK আবার শেয়ার করতে হবে না — APK যেহেতু লাইভ ওয়েব অ্যাপ লোড করে, সাইটে ডিপ্লয় করা মাত্র আপডেট সবার কাছে চলে যাবে।" },
  { n: 4, t: "নতুন APK লাগবে শুধু তখনই যখন নেটিভ সেটিংস (আইকন, নাম, পারমিশন) বদলানো হবে।" },
];

export default function AndroidAppPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-5">
      {/* ── Hero ─────────────────────────────────────── */}
      <div className="card overflow-hidden">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-lg">
              <Smartphone size={32} />
            </span>
            <div>
              <h1 className="text-xl font-bold text-slate-900">প্লে-স্টোর ছাড়াই অ্যান্ড্রয়েড অ্যাপ</h1>
              <p className="mt-0.5 max-w-md text-[12px] font-medium leading-relaxed text-slate-500">
                এই ওয়েব-অ্যাপটিকেই এক ট্যাপে APK বানিয়ে শিক্ষক-শিক্ষার্থীদের ফোনে সরাসরি পৌঁছে দিন — Google Play-এর ২৫$ ফি ও রিভিউ কিউ ছাড়াই।
              </p>
            </div>
          </div>
          <div className="no-print flex shrink-0 flex-col gap-2">
            <a href="/manifest.json" target="_blank" rel="noreferrer" className="btn-ghost h-10 text-[12px]"><Package size={15} /> manifest.json <ExternalLink size={12} /></a>
            <button onClick={() => window.print()} className="btn-ghost h-10 text-[12px]"><Printer size={15} /> গাইড প্রিন্ট করুন</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> PWA manifest যুক্ত ✓</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> theme-color #2f5fe0 ✓</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> SVG আইকন (যেকোনো সাইজ) ✓</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500" /> লাইভ SSE সিঙ্ক — APK-ও লাইভ থাকবে ✓</span>
        </div>
      </div>

      {/* ── Three options ────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {OPTIONS.map(({ icon: Icon, tag, title, subtitle, tone, iconTone, steps, note }) => (
          <article key={title} className={`flex flex-col rounded-2xl border p-5 ${tone}`}>
            <div className="flex items-center justify-between gap-2">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl text-white ${iconTone}`}><Icon size={22} /></span>
              <span className="chip border-white/60 bg-white/80 text-slate-600">{tag}</span>
            </div>
            <h2 className="mt-3 text-[16px] font-bold text-slate-900">{title}</h2>
            <p className="text-[11px] font-semibold text-slate-500">{subtitle}</p>
            <ol className="mt-3 space-y-2">
              {steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-[12px] font-medium leading-snug text-slate-600">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[10px] font-bold text-slate-500 ring-1 ring-slate-200">{toBn(i + 1)}</span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="mt-auto flex items-start gap-1.5 border-t border-white/70 pt-3 text-[11px] font-semibold leading-snug text-slate-500">
              <ChevronRight size={13} className="mt-0.5 shrink-0" />{note}
            </p>
          </article>
        ))}
      </div>

      {/* ── Distribution + update pro-tips ───────────── */}
      <div className="grid gap-4 md:grid-cols-2">
        <section className="card p-5">
          <SectionTitle dot="bg-brand-500" title="শিক্ষক-শিক্ষার্থীদের কাছে বিতরণ" en="Distribution" />
          <ol className="space-y-2.5">
            {DISTRIBUTION_STEPS.map(({ n, t }) => (
              <li key={n} className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[12px] font-bold text-white">{toBn(n)}</span>
                <span className="text-[12px] font-medium leading-relaxed text-slate-600">{t}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-[11px] font-semibold leading-snug text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            প্রথমবার ইনস্টলে প্রতিটি ফোনে একবার “Unknown sources” অনুমতি লাগবেই — এটি Android-এর স্বাভাবিক নিরাপত্তা নিয়ম, কোনো ভাইরাস নয়।
          </div>
        </section>

        <section className="card flex flex-col p-5">
          <SectionTitle dot="bg-emerald-500" title="আপডেট কৌশল" en="Update playbook" />
          <ul className="space-y-2.5 text-[12px] font-medium leading-relaxed text-slate-600">
            <li className="flex items-start gap-2"><RefreshCw size={15} className="mt-0.5 shrink-0 text-emerald-600" /><span><b className="text-slate-800">UI/ফিচার আপডেট:</b> সাইটে git push করুন — পরেরবার অ্যাপ খুললেই সবাই নতুন ভার্সন পাবে। নতুন APK লাগে না।</span></li>
            <li className="flex items-start gap-2"><Package size={15} className="mt-0.5 shrink-0 text-emerald-600" /><span><b className="text-slate-800">আইকন/নাম/পারমিশন বদল:</b> নতুন APK বিল্ড করে আবার শেয়ার করুন। ভার্সন কোড বাড়িয়ে দিন।</span></li>
            <li className="flex items-start gap-2"><Share2 size={15} className="mt-0.5 shrink-0 text-emerald-600" /><span><b className="text-slate-800">ডিস্ট্রিবিউশন চ্যানেল:</b> WhatsApp গ্রুপ (ব্যাচভিত্তিক), টেলিগ্রাম চ্যানেল, বা Google Drive ফোল্ডার + QR কোড প্রিন্ট করে নোটিশ বোর্ডে টাঙান।</span></li>
          </ul>
          <div className="mt-auto border-t border-dashed border-slate-200 pt-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">এই সেশনে আপনার তথ্য</p>
            <p className="mt-1 text-[12px] font-semibold text-slate-600">অ্যাপ: কোচিং ম্যানেজার · প্যাকেজ আইডি (সুপারিশ): <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-800">com.adarsha.coaching</code></p>
            <p className="text-[12px] font-semibold text-slate-600">হোস্টিং সুপারিশ: Vercel (ফ্রি) বা Firebase Hosting</p>
          </div>
        </section>
      </div>
    </div>
  );
}
