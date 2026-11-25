import { db } from "@/db";
import { students, studyGoals, studyChecks } from "@/db/schema";
import { sql, eq, inArray } from "drizzle-orm";
import { apiUser } from "@/lib/auth";
import { publish } from "@/lib/events";
import { todayLocal } from "@/lib/format";

export const dynamic = "force-dynamic";

const p = (x: number) => String(x).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
const addDays = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };
const WEEKDAYS_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];

async function buildState(userId: number) {
  const [st] = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
  if (!st) return null;

  const goals = await db.select().from(studyGoals)
    .where(eq(studyGoals.studentId, st.id))
    .orderBy(studyGoals.sort, studyGoals.id);
  const goalIds = goals.map((g) => g.id);

  const checks = goalIds.length
    ? await db.select({ goalId: studyChecks.goalId, date: studyChecks.date })
        .from(studyChecks)
        .where(inArray(studyChecks.goalId, goalIds))
    : [];

  const byDate = new Map<string, Set<number>>();
  for (const c of checks) {
    if (!byDate.has(c.date)) byDate.set(c.date, new Set());
    byDate.get(c.date)!.add(c.goalId);
  }

  const today = todayLocal();
  const now = new Date();
  const localToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const total = goals.length;
  const activeThreshold = Math.max(1, Math.ceil(total / 2));
  const activeOn = (d: string) => (byDate.get(d)?.size ?? 0) >= activeThreshold;

  // Streak: consecutive active days ending today/yesterday
  let streak = 0;
  let cursor = localToday;
  if (!activeOn(today)) cursor = addDays(localToday, -1);
  for (let i = 0; i < 400; i++) {
    const d = isoOf(cursor);
    if (activeOn(d)) { streak += 1; cursor = addDays(cursor, -1); } else break;
  }

  // Best streak over all recorded days
  const allDates = [...byDate.keys()].sort();
  let best = 0, run = 0, prev: string | null = null;
  for (const d of allDates) {
    if (activeOn(d)) {
      if (prev) {
        const prevD = new Date(prev + "T00:00:00");
        const curD = new Date(d + "T00:00:00");
        run = (curD.getTime() - prevD.getTime()) === 86400000 ? run + 1 : 1;
      } else run = 1;
      best = Math.max(best, run);
      prev = d;
    }
  }

  // Last 7 days week strip
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(localToday, i - 6);
    const date = isoOf(d);
    return {
      date,
      weekday: WEEKDAYS_BN[d.getDay()],
      done: byDate.get(date)?.size ?? 0,
      total,
      isToday: date === today,
    };
  });

  const todayChecked = byDate.get(today) ?? new Set<number>();
  const doneToday = todayChecked.size;
  const pct = total > 0 ? Math.round((doneToday / total) * 100) : 0;

  const message =
    pct === 100 ? "অসাধারণ! আজকের সব লক্ষ্য পূরণ হয়েছে" :
    pct >= 60 ? "দারুণ চলছে — বাকিটাও শেষ করো!" :
    pct > 0 ? "শুরু সুন্দর হয়েছে, চালিয়ে যাও" :
    "আজকের প্রথম টিক দিয়ে শুরু করো";

  return {
    today,
    total,
    doneToday,
    pct,
    streak,
    bestStreak: Math.max(best, streak),
    lifetimeChecks: checks.length,
    message,
    goals: goals.map((g) => ({ id: g.id, title: g.title, checked: todayChecked.has(g.id) })),
    week,
  };
}

export async function GET() {
  const { user, error } = await apiUser("student");
  if (error) return error;
  const state = await buildState(user.id);
  if (!state) return Response.json({ error: "শিক্ষার্থী প্রোফাইল নেই" }, { status: 404 });
  return Response.json(state);
}

export async function POST(req: Request) {
  const { user, error } = await apiUser("student");
  if (error) return error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "অনুরোধ সঠিক নয়" }, { status: 400 }); }

  const goalId = Number(body.goalId);
  const date = String(body.date || todayLocal());
  if (!goalId) return Response.json({ error: "goalId দিন" }, { status: 400 });

  const [st] = await db.select({ id: students.id }).from(students).where(eq(students.userId, user.id)).limit(1);
  if (!st) return Response.json({ error: "শিক্ষার্থী প্রোফাইল নেই" }, { status: 404 });
  const [goal] = await db.select().from(studyGoals)
    .where(eq(studyGoals.id, goalId)).limit(1);
  if (!goal || goal.studentId !== st.id) {
    return Response.json({ error: "এই লক্ষ্যটি আপনার নয়" }, { status: 403 });
  }

  const existing = await db.select().from(studyChecks)
    .where(sql`${studyChecks.goalId} = ${goalId} and ${studyChecks.date} = ${date}`).limit(1);
  if (existing.length) {
    await db.delete(studyChecks).where(eq(studyChecks.id, existing[0].id));
  } else {
    await db.insert(studyChecks).values({ goalId, date }).onConflictDoNothing();
  }

  publish("study", { studentId: st.id });
  const state = await buildState(user.id);
  return Response.json(state);
}
