import { db } from "@/db";
import { attendance, batches, students, classSessions } from "@/db/schema";
import { sql, and, eq } from "drizzle-orm";
import { apiUser } from "@/lib/auth";
import { publish } from "@/lib/events";
import { todayLocal } from "@/lib/format";

export const dynamic = "force-dynamic";
const num = (v: unknown) => Number(v ?? 0);

async function teacherOwnsBatch(userId: number, batchId: number) {
  const [b] = await db.select({ id: batches.id }).from(batches)
    .where(and(eq(batches.id, batchId), eq(batches.teacherId, userId))).limit(1);
  return !!b;
}

export async function GET(req: Request) {
  const { user, error } = await apiUser("admin", "teacher");
  if (error) return error;

  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId");
  const date = url.searchParams.get("date") || todayLocal();
  const month = url.searchParams.get("month") || todayLocal().slice(0, 7);

  // ── Month calendar summary (whole academy or one batch) ──
  if (url.searchParams.get("scope") === "calendar") {
    const like = `${month}-%`;
    const batchFilter = batchId ? sql`and s.batch_id = ${Number(batchId)}` : sql``;
    const rows = (await db.execute(sql`
      select a.date, count(*)::int as marked,
             count(*) filter (where a.status in ('present','late'))::int as attended
      from attendance a join students s on s.id = a.student_id
      where a.date like ${like} ${batchFilter}
      group by a.date order by a.date
    `)).rows as Record<string, unknown>[];
    const days = rows.map((r) => ({
      date: String(r.date), marked: num(r.marked), attended: num(r.attended),
      rate: num(r.marked) > 0 ? Math.round((num(r.attended) / num(r.marked)) * 100) : 0,
    }));
    const marked = days.reduce((a, d) => a + d.marked, 0);
    const attended = days.reduce((a, d) => a + d.attended, 0);
    return Response.json({
      month, days,
      monthMarked: marked, monthAttended: attended,
      monthRate: marked > 0 ? Math.round((attended / marked) * 100) : 0,
    });
  }

  // ── Roster for one batch on one date ──
  if (!batchId) return Response.json({ error: "batchId দিন" }, { status: 400 });
  const bId = Number(batchId);
  if (user.role === "teacher" && !(await teacherOwnsBatch(user.id, bId))) {
    return Response.json({ error: "এই ব্যাচটি আপনার নয়" }, { status: 403 });
  }
  const roster = (await db.execute(sql`
    select s.id as student_id, s.code, u.name, u.name_bn, u.avatar_color, u.phone,
           b.name_bn as batch_bn,
           (select a.status from attendance a where a.student_id = s.id and a.date = ${date} limit 1) as status
    from students s
    join users u on u.id = s.user_id
    join batches b on b.id = s.batch_id
    where s.batch_id = ${bId}
    order by s.id
  `)).rows as Record<string, unknown>[];

  const sessions = (await db.execute(sql`
    select count(*)::int as n, coalesce(max(date), null) as last_date
    from class_sessions where batch_id = ${bId}
  `)).rows as Record<string, unknown>[];

  return Response.json({
    date,
    batchId: bId,
    sessionsHeld: num(sessions[0]?.n),
    roster: roster.map((r) => ({
      studentId: num(r.student_id),
      code: String(r.code),
      name: String(r.name),
      nameBn: String(r.name_bn),
      phone: String(r.phone),
      batchBn: String(r.batch_bn),
      avatarColor: String(r.avatar_color),
      status: r.status ? String(r.status) : null,
    })),
    counts: {
      present: roster.filter((r) => r.status === "present").length,
      late: roster.filter((r) => r.status === "late").length,
      absent: roster.filter((r) => r.status === "absent").length,
    },
  });
}

export async function POST(req: Request) {
  const { user, error } = await apiUser("admin", "teacher");
  if (error) return error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "অনুরোধ সঠিক নয়" }, { status: 400 }); }

  const bId = Number(body.batchId);
  if (!bId) return Response.json({ error: "batchId দিন" }, { status: 400 });
  if (user.role === "teacher" && !(await teacherOwnsBatch(user.id, bId))) {
    return Response.json({ error: "এই ব্যাচটি আপনার নয়" }, { status: 403 });
  }

  // ── Mark a class as held / complete ──
  if (body.action === "complete_class") {
    const date = String(body.date || todayLocal());
    const title = String(body.title || "নিয়মিত ক্লাস").trim() || "নিয়মিত ক্লাস";
    const durationMin = Math.max(15, Math.round(Number(body.durationMin || 60)));
    const [row] = await db.insert(classSessions).values({
      batchId: bId, teacherId: user.id, title, date, durationMin,
    }).returning();
    publish("class", { batchId: bId, date });
    return Response.json({ ok: true, sessionId: row.id });
  }

  // ── Bulk attendance marks ──
  const date = String(body.date || todayLocal());
  const marks = Array.isArray(body.marks) ? body.marks as Array<{ studentId: number; status: string }> : [];
  if (marks.length === 0) return Response.json({ error: "কমপক্ষে একজন শিক্ষার্থীর উপস্থিতি দিন" }, { status: 400 });

  let saved = 0;
  for (const m of marks) {
    const status = ["present", "late", "absent"].includes(m.status) ? m.status : null;
    if (!status) continue;
    await db.insert(attendance).values({
      studentId: Number(m.studentId), date, status, markedBy: user.id,
    }).onConflictDoUpdate({
      target: [attendance.studentId, attendance.date],
      set: { status, markedBy: user.id },
    });
    saved += 1;
  }
  publish("attendance", { batchId: bId, date });
  return Response.json({ ok: true, saved, date });
}
