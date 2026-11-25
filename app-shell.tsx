"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Layers, CalendarCheck2, Wallet, BarChart3, Smartphone,
  ClipboardCheck, Megaphone, SendHorizonal, Home, Video, BookOpenCheck, Menu, X,
  GraduationCap, LogOut, ChevronRight,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { Avatar } from "./kit";
import { Toaster, LiveBadge } from "./live";
import { toBn, bnDateShort, todayLocal } from "@/lib/format";

type NavItem = { href: string; label: string; en: string; icon: React.ComponentType<{ size?: number; className?: string }> };

const NAV: Record<string, NavItem[]> = {
  admin: [
    { href: "/admin", label: "ড্যাশবোর্ড", en: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/students", label: "স্টুডেন্টস", en: "Students", icon: Users },
    { href: "/admin/batches", label: "ব্যাচসমূহ", en: "Batches", icon: Layers },
    { href: "/admin/attendance", label: "উপস্থিতি", en: "Attendance", icon: CalendarCheck2 },
    { href: "/admin/fees", label: "বেতন ও বাকি", en: "Fees & Dues", icon: Wallet },
    { href: "/admin/reports", label: "রিপোর্ট", en: "Reports", icon: BarChart3 },
    { href: "/admin/app", label: "অ্যান্ড্রয়েড অ্যাপ", en: "APK Guide", icon: Smartphone },
  ],
  teacher: [
    { href: "/teacher", label: "আজকের ক্লাস", en: "Today's Class", icon: ClipboardCheck },
    { href: "/teacher#publish", label: "লিংক ও নোটিশ", en: "Publish", icon: Megaphone },
    { href: "/teacher#posts", label: "প্রকাশিত পোস্ট", en: "My Posts", icon: SendHorizonal },
    { href: "/teacher#roster", label: "আমার ক্লাসরোস্টার", en: "Roster", icon: Users },
  ],
  student: [
    { href: "/student", label: "আমার স্টাডি হাব", en: "My Hub", icon: Home },
    { href: "/student#join", label: "আজকের ক্লাস", en: "Join Class", icon: Video },
    { href: "/student#study", label: "নিয়মিত পড়া", en: "Study Tracker", icon: BookOpenCheck },
    { href: "/student#attendance", label: "আমার উপস্থিতি", en: "Attendance", icon: CalendarCheck2 },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  admin: "অ্যাডমিন / পরিচালক",
  teacher: "শিক্ষক",
  student: "শিক্ষার্থী",
};

const PATH_TITLES: Record<string, [string, string]> = {
  "/admin": ["ড্যাশবোর্ড", "Live overview · আজকের অবস্থা"],
  "/admin/students": ["স্টুডেন্টস", "শিক্ষার্থী ডিরেক্টরি · ভর্তি ও প্রোফাইল"],
  "/admin/batches": ["ব্যাচসমূহ", "ব্যাচ, শিক্ষক ও রুটিন"],
  "/admin/attendance": ["উপস্থিতি", "মাসিক ক্যালেন্ডার · আজকের মার্কিং"],
  "/admin/fees": ["বেতন ও বাকি", "মাসিক বেতন সংগ্রহ · বকেয়া তালিকা"],
  "/admin/reports": ["রিপোর্ট", "ক্লাস-কাউন্ট সামারি · এক্সপোর্ট"],
  "/admin/app": ["অ্যান্ড্রয়েড অ্যাপ", "APK প্যাকেজিং গাইড · বিতরণ"],
  "/teacher": ["আজকের ক্লাস", "উপস্থিতি · লাইভ লিংক ও নোটিশ"],
  "/student": ["আমার স্টাডি হাব", "লাইভ ক্লাস · নিয়মিত পড়া ট্র্যাকার"],
};

function NavLinks({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1 px-3">
      {items.map(({ href, label, en, icon: Icon }) => {
        const base = href.split("#")[0];
        const active = pathname === base && !href.includes("#");
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-bold transition ${
              active
                ? "bg-brand-600 text-white shadow-[0_8px_18px_-8px_rgb(47_95_224/0.8)]"
                : "text-slate-600 hover:bg-brand-50 hover:text-brand-700"
            }`}
          >
            <Icon size={19} className={active ? "text-white" : "text-slate-400 transition group-hover:text-brand-600"} />
            <span className="flex-1">{label}</span>
            <span className={`text-[9px] font-semibold uppercase tracking-wider ${active ? "text-brand-100" : "text-slate-300 group-hover:text-brand-300"}`}>
              {en}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarBody({ user, role, onNavigate }: { user: SessionUser; role: string; onNavigate?: () => void }) {
  const router = useRouter();
  const items = NAV[role] ?? NAV.student;
  return (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <Link href={role === "admin" ? "/admin" : role === "teacher" ? "/teacher" : "/student"} onClick={onNavigate}
        className="flex items-center gap-2.5 px-5 pb-5 pt-6">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 text-white shadow-lg">
          <GraduationCap size={23} />
        </span>
        <span className="leading-tight">
          <span className="block text-[17px] font-bold text-slate-900">কোচিং ম্যানেজার</span>
          <span className="block text-[10px] font-bold uppercase tracking-[0.22em] text-brand-600">Adorsha Academy</span>
        </span>
      </Link>

      {/* Nav */}
      <NavLinks items={items} onNavigate={onNavigate} />

      {/* Footer: user + logout */}
      <div className="mt-auto px-4 pb-5">
        <div className="rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-3">
          <div className="flex items-center gap-2.5">
            <Avatar name={user.nameBn || user.name} color={user.avatarColor} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-bold text-slate-800">{user.nameBn || user.name}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{ROLE_LABEL[role]}</p>
            </div>
          </div>
          <button
            onClick={async () => {
              await fetch("/api/auth", { method: "DELETE" });
              router.replace("/login");
              router.refresh();
            }}
            className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-[12px] font-bold text-slate-500 transition hover:border-red-200 hover:text-red-600"
          >
            <LogOut size={14} /> সাইন আউট
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AppShell({
  user, role, children,
}: {
  user: SessionUser;
  role: "admin" | "teacher" | "student";
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [title, subtitle] = PATH_TITLES[pathname] ?? ["কোচিং ম্যানেজার", "আদর্শ একাডেমী"];

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <Toaster>
      <div className="min-h-dvh">
        {/* ── Desktop sidebar ─── */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] border-r border-slate-200/80 bg-white lg:block">
          <SidebarBody user={user} role={role} />
        </aside>

        {/* ── Mobile drawer ─── */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button aria-label="বন্ধ করুন" onClick={() => setOpen(false)} className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]" />
            <div className="absolute inset-y-0 left-0 w-[280px] bg-white shadow-2xl">
              <button onClick={() => setOpen(false)} aria-label="বন্ধ করুন" className="absolute right-3 top-4 rounded-xl p-2 text-slate-400 hover:bg-slate-100">
                <X size={20} />
              </button>
              <SidebarBody user={user} role={role} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        )}

        {/* ── Main column ─── */}
        <div className="lg:pl-[248px]">
          {/* Top bar */}
          <header className="no-print sticky top-0 z-30 border-b border-slate-200/70 bg-[#f3f5fa]/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-3 px-4 sm:px-6">
              <button onClick={() => setOpen(true)} aria-label="মেনু" className="icon-btn lg:hidden">
                <Menu size={20} />
              </button>
              <div className="min-w-0">
                <h1 className="flex items-center gap-2 truncate text-[17px] font-bold text-slate-900">
                  {title}
                </h1>
                <p className="hidden truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:block">
                  {subtitle ?? `${bnDateShort(todayLocal())} · আদর্শ একাডেমী`}
                </p>
              </div>
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <LiveBadge lastUpdated={null} />
                <span className="hidden items-center gap-1 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 md:inline-flex">
                  {toBn(new Date().getFullYear())} <ChevronRight size={11} /> একাডেমিক সেশন
                </span>
                <Avatar name={user.nameBn || user.name} color={user.avatarColor} size={38} />
              </div>
            </div>
          </header>

          <main className="mx-auto max-w-[1440px] p-4 pb-10 sm:p-6">{children}</main>

          <footer className="no-print border-t border-slate-200/70 py-4 text-center text-[11px] font-medium text-slate-400">
            আদর্শ একাডেমী · কোচিং ম্যানেজার v{toBn(1)}.০ — <span className="text-brand-600">সব হিসেব এক জায়গায়</span>
          </footer>
        </div>
      </div>
    </Toaster>
  );
}
