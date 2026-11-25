import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { toBn } from "@/lib/format";

/* ── Avatar: colored circle with Bengali initial ─────────── */
export function Avatar({
  name, color, size = 40, className = "",
}: { name: string; color?: string; size?: number; className?: string }) {
  const initial = (Array.from(name || "?").find((c) => c.trim()) || "?").toUpperCase();
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white ring-2 ring-white ${className}`}
      style={{
        width: size, height: size, background: color || "#2f5fe0",
        fontSize: Math.round(size * 0.42),
      }}
    >
      {initial}
    </span>
  );
}

/* ── StatCard for dashboards ───────────────────────────── */
const TONES: Record<string, { bg: string; fg: string; ring: string }> = {
  blue: { bg: "bg-brand-50", fg: "text-brand-600", ring: "ring-brand-100" },
  violet: { bg: "bg-violet-50", fg: "text-violet-600", ring: "ring-violet-100" },
  green: { bg: "bg-emerald-50", fg: "text-emerald-600", ring: "ring-emerald-100" },
  red: { bg: "bg-red-50", fg: "text-red-600", ring: "ring-red-100" },
  amber: { bg: "bg-amber-50", fg: "text-amber-600", ring: "ring-amber-100" },
};

export function StatCard({
  icon: Icon, label, value, sub, tone = "blue", action,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: keyof typeof TONES | string;
  action?: ReactNode;
}) {
  const t = TONES[tone] ?? TONES.blue;
  return (
    <div className="card group flex items-center gap-4 p-4 sm:p-5">
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${t.bg} ${t.fg} ring-4 ${t.ring} transition-transform group-hover:scale-105`}>
        <Icon size={26} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-0.5 truncate text-[26px] font-bold leading-7 text-slate-900">{value}</p>
        {sub ? <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500">{sub}</p> : null}
      </div>
      {action ? <div className="ml-auto shrink-0 self-start">{action}</div> : null}
    </div>
  );
}

/* ── Section title with accent bar ─────────────────────── */
export function SectionTitle({
  dot = "bg-brand-500", title, en, right,
}: { dot?: string; title: string; en?: string; right?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="section-title">
        <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
        {title}
        {en ? <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-slate-400 sm:inline">· {en}</span> : null}
      </h2>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

/* ── Rate badge: green / amber / red by percentage ───────── */
export function RateBadge({ rate, suffix = "%" }: { rate: number | null; suffix?: string }) {
  if (rate === null) return <span className="chip border-slate-200 bg-slate-50 text-slate-400">—</span>;
  const tone =
    rate >= 80 ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : rate >= 60 ? "border-amber-200 bg-amber-50 text-amber-700"
    : "border-red-200 bg-red-50 text-red-600";
  return <span className={`chip ${tone}`}>{toBn(rate)}{suffix}</span>;
}

/* ── Fee status chip ────────────────────────────────────── */
export function FeeChip({ status }: { status: "paid" | "partial" | "due" }) {
  const map = {
    paid: { t: "পরিশোধিত", c: "border-emerald-200 bg-emerald-50 text-emerald-700" },
    partial: { t: "আংশিক", c: "border-amber-200 bg-amber-50 text-amber-700" },
    due: { t: "বকেয়া", c: "border-red-200 bg-red-50 text-red-600" },
  } as const;
  const m = map[status];
  return <span className={`chip ${m.c}`}>{m.t}</span>;
}

/* ── Progress bar ───────────────────────────────────────── */
export function ProgressBar({ value, max, tone = "bg-brand-600" }: { value: number; max: number; tone?: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
      <div className={`h-full rounded-full ${tone} transition-all duration-500`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────── */
export function EmptyState({ icon: Icon, title, hint }: { icon: React.ComponentType<{ size?: number; className?: string }>; title: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
        <Icon size={26} />
      </span>
      <p className="text-[14px] font-bold text-slate-600">{title}</p>
      {hint ? <p className="max-w-xs text-[12px] font-medium leading-relaxed text-slate-400">{hint}</p> : null}
    </div>
  );
}

/* ── Button spinner ─────────────────────────────────────── */
export function Spinner() {
  return <Loader2 size={17} className="animate-spin" />;
}
