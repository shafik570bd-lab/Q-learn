"use client";

import {
  createContext, useCallback, useContext, useEffect, useRef, useState,
  type ReactNode,
} from "react";
import { CheckCircle2, Wifi, WifiOff } from "lucide-react";
import { timeAgo } from "@/lib/format";

/* ── Live data: fetch + subscribe to /api/events (SSE) with polling fallback ── */
export type LiveState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  lastUpdated: number | null;
};

export function useLiveData<T>(url: string | null, intervalMs = 30000): LiveState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const load = useCallback(async () => {
    const u = urlRef.current;
    if (!u) return;
    try {
      const r = await fetch(u, { cache: "no-store", credentials: "same-origin" });
      if (!r.ok) throw new Error(`সার্ভার সমস্যা (${r.status})`);
      const j = (await r.json()) as T;
      setData(j);
      setError(null);
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : "নেটওয়ার্ক সমস্যা — অফলাইন?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load();
    const es = new EventSource("/api/events");
    es.onmessage = () => { load(); };
    const poll = window.setInterval(load, intervalMs);
    return () => {
      es.close();
      window.clearInterval(poll);
    };
  }, [url, load, intervalMs]);

  return { data, loading, error, refresh: load, lastUpdated };
}

/* ── Toast ─────────────────────────────────────────────── */
const ToastCtx = createContext<{ push: (msg: string) => void }>({ push: () => {} });
export const useToast = () => useContext(ToastCtx);

export function toast(msg: string) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent<string>("app:toast", { detail: msg }));
  }
}

export function Toaster({ children }: { children?: ReactNode }) {
  const [items, setItems] = useState<Array<{ id: number; msg: string }>>([]);
  useEffect(() => {
    let id = 0;
    const handler = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      id += 1;
      const nid = id;
      setItems((xs) => [...xs.slice(-2), { id: nid, msg }]);
      window.setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== nid)), 3400);
    };
    window.addEventListener("app:toast", handler);
    return () => window.removeEventListener("app:toast", handler);
  }, []);
  return (
    <ToastCtx.Provider value={{ push: toast }}>
      {children}
      <div className="toast-wrap pointer-events-none fixed bottom-5 left-1/2 z-[70] flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className="toast-in pointer-events-auto flex w-auto max-w-full items-center gap-2 rounded-2xl bg-slate-900/95 py-2.5 pl-3 pr-4 text-[13px] font-semibold text-white shadow-2xl ring-1 ring-white/10 backdrop-blur"
          >
            <CheckCircle2 size={16} className="shrink-0 text-emerald-400" />
            <span className="leading-snug">{t.msg}</span>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ── Live badge for headers ────────────────────────────── */
export function LiveBadge({ lastUpdated }: { lastUpdated: number | null }) {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return (
    <span
      title={lastUpdated ? `সর্বশেষ সিঙ্ক: ${timeAgo(new Date(lastUpdated))}` : "লাইভ সিঙ্ক চালু"}
      className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 py-1 pl-2 pr-2.5 text-[11px] font-bold text-emerald-700"
    >
      <span className="relative flex h-2.5 w-2.5">
        <span className="live-dot h-2.5 w-2.5 rounded-full bg-emerald-500" />
      </span>
      লাইভ
      {online ? <Wifi size={12} /> : <WifiOff size={12} className="text-amber-500" />}
    </span>
  );
}

/* ── Skeleton block ────────────────────────────────────── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;
}
