import { db } from "@/db";
import { sql } from "drizzle-orm";
import { apiUser } from "@/lib/auth";
import { todayLocal, currentMonth } from "@/lib/format";

export const dynamic = "force-dynamic";
const num = (v: unknown) => Number(v ?? 0);

/** Teacher workspace bundle: my batches, stats, low-attendance watchlist */
export async function GET() {
  const { user, error } = await apiUser("teacher", "admin");
  if (error) return error;

  const today = todayLocal();
  const month = currentMonth();

  const rows = (await db.execute(sql`
    select b.id, b.name, b.name_bn, b.subject, b.schedule, b.room, b.monthly_fee, b.capacity,
           (select count(*)::int from students s where s.batch_id = b.id) as student_count,
           (select count(*) filter (where a.status in ('present','late'))::int
              from attendance a join students s2 on s2.id = a.student_id
              where s2.batch_id = b.id and a.date = ${today}) as present_today,
           (select count(*)::int from attendance a join students s2 on s2.id = a.student_id
              where s2.batch_id = b.id and a.date = ${today}) as marked_today
    from batches b
    where b.status = 'active' and (${user.role} = 'admin' or b.teacher_id = ${user.id})
    order by b.id
  `)).rows as Record<string, unknown>[];

  const batches = rows.map((r) => ({
    id: num(r.id),
    name: String(r.name),
    nameBn: String(r.name_bn),
    subject: String(r.subject),
    schedule: String(r.schedule),
    room: String(r.room),
    monthlyFee: num(r.monthly_fee),
    capacity: num(r.capacity),
    studentCount: num(r.student_count),
    presentToday: num(r.present_today),
    markedToday: num(r.marked_today),
  }));

  const myBatchIds = batches.map((b) => b.id);
  const batchList = myBatchIds.length ? sql`in (${sql.join(myBatchIds.map((i) => sql`${i}`), sql`, `)})` : sql`in (0)`;

  const [lowRows, monthClassesRow, totalStudentsRow] = await Promise.all([
    db.execute(sql`
      select s.code, u.name, u.name_bn, u.avatar_color,
             count(*) filter (where a.status in ('present','late'))::int as attended,
             count(*)::int as total
      from students s
      join users u on u.id = s.user_id
      join attendance a on a.student_id = s.id
      where s.batch_id ${batchList}
      group by s.id, s.code, u.name, u.name_bn, u.avatar_color
      having count(*) >= 4 and (count(*) filter (where a.status in ('present','late')))::float / count(*) < 0.75
      order by (count(*) filter (where a.status in ('present','late')))::float / count(*) asc
      limit 5
    `),
    db.execute(sql`
      select count(*)::int as n from class_sessions
      where teacher_id = ${user.id} and date like ${month + "-%"}
    `),
    db.execute(sql`select count(*)::int as n from students where batch_id ${batchList}`),
  ]);

  return Response.json({
    today,
    month,
    batches,
    stats: {
      totalStudents: num((totalStudentsRow.rows as Record<string, unknown>[])[0]?.n),
      batchCount: batches.length,
      todayPresent: batches.reduce((a, b) => a + b.presentToday, 0),
      todayMarked: batches.reduce((a, b) => a + b.markedToday, 0),
      monthClasses: num((monthClassesRow.rows as Record<string, unknown>[])[0]?.n),
    },
    lowAttendance: (lowRows.rows as Record<string, unknown>[]).map((r) => ({
      code: String(r.code),
      name: String(r.name),
      nameBn: String(r.name_bn),
      avatarColor: String(r.avatar_color),
      attended: num(r.attended),
      total: num(r.total),
      rate: Math.round((num(r.attended) / Math.max(1, num(r.total))) * 100),
    })),
  });
}
