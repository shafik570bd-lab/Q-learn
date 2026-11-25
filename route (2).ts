import { db } from "@/db";
import { sql } from "drizzle-orm";
import { apiUser } from "@/lib/auth";
import { todayLocal, currentMonth, bnMonthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";

const num = (v: unknown) => Number(v ?? 0);

export async function GET() {
  const { user, error } = await apiUser("admin");
  if (error) return error;

  const today = todayLocal();
  const month = currentMonth();
  const like = `${month}-%`;

  const [totals] = (await db.execute(sql`
    select
      (select count(*)::int from students) as total_students,
      (select count(*)::int from batches where status = 'active') as active_batches,
      (select count(*)::int from attendance where date = ${today}) as today_marked,
      (select count(*) filter (where status in ('present','late'))::int from attendance where date = ${today}) as today_attended,
      (select coalesce(sum(amount - paid), 0)::int from fees where month = ${month} and amount > paid) as pending_dues,
      (select count(*)::int from fees where month = ${month} and amount > paid) as due_count,
      (select coalesce(sum(paid), 0)::int from fees where month = ${month}) as collected_this_month,
      (select count(*)::int from class_sessions where date like ${like}) as month_sessions
  `)).rows as Record<string, unknown>[];

  const totalStudents = num(totals.total_students);
  const todayAttended = num(totals.today_attended);

  const batchRows = (await db.execute(sql`
    select b.id, b.name, b.name_bn, b.subject, b.schedule, b.room, b.monthly_fee, b.capacity,
           coalesce(u.name_bn, u.name) as teacher_bn,
           (select count(*)::int from students s where s.batch_id = b.id) as student_count,
           (select count(*) filter (where a.status in ('present','late'))::int
              from attendance a join students s2 on s2.id = a.student_id
              where s2.batch_id = b.id and a.date = ${today}) as present_today
    from batches b join users u on u.id = b.teacher_id
    where b.status = 'active'
    order by b.id
  `)).rows as Record<string, unknown>[];

  const recentStudents = (await db.execute(sql`
    select s.id, s.code, s.joined_at, u.name, u.name_bn, u.avatar_color, b.name_bn as batch_bn
    from students s
    join users u on u.id = s.user_id
    join batches b on b.id = s.batch_id
    order by s.joined_at desc, s.id desc
    limit 6
  `)).rows as Record<string, unknown>[];

  const dues = (await db.execute(sql`
    select f.id as fee_id, f.student_id, f.amount, f.paid, s.code,
           u.name, u.name_bn, u.avatar_color, b.name_bn as batch_bn
    from fees f
    join students s on s.id = f.student_id
    join users u on u.id = s.user_id
    join batches b on b.id = s.batch_id
    where f.month = ${month} and f.amount > f.paid
    order by (f.amount - f.paid) desc
    limit 6
  `)).rows as Record<string, unknown>[];

  const calRows = (await db.execute(sql`
    select date, count(*)::int as marked,
           count(*) filter (where status in ('present','late'))::int as attended
    from attendance
    where date like ${like}
    group by date
    order by date
  `)).rows as Record<string, unknown>[];

  const calendar = calRows.map((r) => ({
    date: String(r.date),
    marked: num(r.marked),
    attended: num(r.attended),
    rate: num(r.marked) > 0 ? Math.round((num(r.attended) / num(r.marked)) * 100) : 0,
  }));
  const calMarked = calendar.reduce((a, c) => a + c.marked, 0);
  const calAttended = calendar.reduce((a, c) => a + c.attended, 0);
  const monthRate = calMarked > 0 ? Math.round((calAttended / calMarked) * 100) : 0;

  return Response.json({
    today,
    month,
    monthLabel: bnMonthLabel(month),
    stats: {
      totalStudents,
      activeBatches: num(totals.active_batches),
      todayRate: totalStudents > 0 ? Math.round((todayAttended / totalStudents) * 100) : 0,
      todayMarked: num(totals.today_marked),
      todayAttended,
      pendingDues: num(totals.pending_dues),
      dueCount: num(totals.due_count),
      collectedThisMonth: num(totals.collected_this_month),
      monthSessions: num(totals.month_sessions),
      monthRate,
    },
    batches: batchRows.map((r) => ({
      id: num(r.id),
      name: String(r.name),
      nameBn: String(r.name_bn),
      subject: String(r.subject),
      schedule: String(r.schedule),
      room: String(r.room),
      monthlyFee: num(r.monthly_fee),
      capacity: num(r.capacity),
      teacherBn: String(r.teacher_bn),
      studentCount: num(r.student_count),
      presentToday: num(r.present_today),
    })),
    recentStudents: recentStudents.map((r) => ({
      id: num(r.id),
      code: String(r.code),
      joinedAt: String(r.joined_at),
      name: String(r.name),
      nameBn: String(r.name_bn),
      batchBn: String(r.batch_bn),
      avatarColor: String(r.avatar_color),
    })),
    dues: dues.map((r) => ({
      feeId: num(r.fee_id),
      studentId: num(r.student_id),
      code: String(r.code),
      name: String(r.name),
      nameBn: String(r.name_bn),
      batchBn: String(r.batch_bn),
      avatarColor: String(r.avatar_color),
      amount: num(r.amount),
      paid: num(r.paid),
      due: num(r.amount) - num(r.paid),
    })),
    calendar,
    trend: calendar.slice(-14),
  });
}
