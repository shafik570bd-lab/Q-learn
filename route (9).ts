import { db } from "@/db";
import { batches, users, students } from "@/db/schema";
import { sql, desc } from "drizzle-orm";
import { apiUser } from "@/lib/auth";
import { publish } from "@/lib/events";
import { todayLocal } from "@/lib/format";

export const dynamic = "force-dynamic";
const num = (v: unknown) => Number(v ?? 0);

export async function GET() {
  const { user, error } = await apiUser("admin", "teacher");
  if (error) return error;

  const rows = (await db.execute(sql`
    select b.id, b.name, b.name_bn, b.subject, b.schedule, b.room, b.monthly_fee, b.capacity, b.status,
           b.teacher_id, coalesce(u.name_bn, u.name) as teacher_bn, u.avatar_color as teacher_color,
           (select count(*)::int from students s where s.batch_id = b.id) as student_count,
           (select count(*) filter (where a.status in ('present','late'))::int
              from attendance a join students s2 on s2.id = a.student_id
              where s2.batch_id = b.id and a.date = ${todayLocal()}) as present_today,
           (select count(*) filter (where a.status in ('present','late'))::int
              from attendance a join students s2 on s2.id = a.student_id
              where s2.batch_id = b.id) as total_attended,
           (select count(*)::int from attendance a join students s2 on s2.id = a.student_id
              where s2.batch_id = b.id) as total_marks
    from batches b join users u on u.id = b.teacher_id
    where (${user.role} = 'admin' or b.teacher_id = ${user.id})
    order by b.id
  `)).rows as Record<string, unknown>[];

  const teacherList = (await db.select({ id: users.id, nameBn: users.nameBn, name: users.name, subject: users.subject })
    .from(users).where(sql`${users.role} = 'teacher'`).orderBy(users.id));

  return Response.json({
    batches: rows.map((r) => ({
      id: num(r.id),
      name: String(r.name),
      nameBn: String(r.name_bn),
      subject: String(r.subject),
      schedule: String(r.schedule),
      room: String(r.room),
      monthlyFee: num(r.monthly_fee),
      capacity: num(r.capacity),
      status: String(r.status),
      teacherId: num(r.teacher_id),
      teacherBn: String(r.teacher_bn),
      teacherColor: String(r.teacher_color),
      studentCount: num(r.student_count),
      presentToday: num(r.present_today),
      rate: num(r.total_marks) > 0 ? Math.round((num(r.total_attended) / num(r.total_marks)) * 100) : null,
    })),
    teachers: teacherList.map((t) => ({ id: t.id, nameBn: t.nameBn || t.name, subject: t.subject })),
  });
}

export async function POST(req: Request) {
  const { user, error } = await apiUser("admin");
  if (error) return error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "অনুরোধ সঠিক নয়" }, { status: 400 }); }

  const nameBn = String(body.nameBn || "").trim();
  const subject = String(body.subject || "").trim();
  const schedule = String(body.schedule || "").trim();
  const room = String(body.room || "").trim();
  const teacherId = Number(body.teacherId);
  const monthlyFee = Math.max(0, Math.round(Number(body.monthlyFee || 1500)));
  const capacity = Math.max(1, Math.round(Number(body.capacity || 40)));
  if (!nameBn || !subject || !teacherId) {
    return Response.json({ error: "ব্যাচের নাম, বিষয় ও শিক্ষক আবশ্যক" }, { status: 400 });
  }
  const [row] = await db.insert(batches).values({
    name: String(body.name || nameBn).trim(),
    nameBn, subject, schedule, room, monthlyFee, capacity, teacherId, status: "active",
  }).returning();

  publish("batch", { batchId: row.id });
  return Response.json({ ok: true, id: row.id }, { status: 201 });
}
