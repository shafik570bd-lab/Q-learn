import { db } from "@/db";
import { sql } from "drizzle-orm";
import { apiUser } from "@/lib/auth";
import { todayLocal, currentMonth, bnMonthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
const num = (v: unknown) => Number(v ?? 0);

/** Class-count summary report: per student → sessions held, attended, rate, fee status */
export async function GET(req: Request) {
  const { user, error } = await apiUser("admin");
  if (error) return error;

  const url = new URL(req.url);
  const batchId = url.searchParams.get("batchId");
  const range = url.searchParams.get("range") === "month" ? "month" : "all";
  const month = currentMonth();
  const monthLike = `${month}-%`;
  const dateCond = range === "month" ? sql`a.date like ${monthLike}` : sql`true`;
  const sessionCond = range === "month" ? sql`date like ${monthLike}` : sql`true`;
  const batchCond = batchId ? sql`s.batch_id = ${Number(batchId)}` : sql`true`;

  const rows = (await db.execute(sql`
    select s.id, s.code, s.joined_at,
           u.name, u.name_bn, u.avatar_color,
           b.name_bn as batch_bn, b.id as batch_id,
           (select count(*)::int from class_sessions cs where cs.batch_id = s.batch_id and ${sessionCond}) as batch_sessions,
           (select count(*) filter (where a.status in ('present','late'))::int from attendance a where a.student_id = s.id and ${dateCond}) as attended,
           (select count(*)::int from attendance a where a.student_id = s.id and ${dateCond}) as marked,
           (select coalesce(sum(amount - paid), 0)::int from fees f where f.student_id = s.id and f.month = ${month} and f.amount > f.paid) as fee_due
    from students s
    join users u on u.id = s.user_id
    join batches b on b.id = s.batch_id
    where ${batchCond}
    order by b.id, s.id
  `)).rows as Record<string, unknown>[];

  const out = rows.map((r) => {
    const marked = num(r.marked);
    const attended = num(r.attended);
    const feeDue = num(r.fee_due);
    return {
      id: num(r.id),
      code: String(r.code),
      name: String(r.name),
      nameBn: String(r.name_bn),
      batchId: num(r.batch_id),
      batchBn: String(r.batch_bn),
      avatarColor: String(r.avatar_color),
      joinedAt: String(r.joined_at),
      batchSessions: num(r.batch_sessions),
      attended,
      marked,
      rate: marked > 0 ? Math.round((attended / marked) * 100) : null,
      feeDue,
      feeStatus: feeDue > 0 ? "due" : "paid",
    };
  });

  const markedSum = out.reduce((a, r) => a + r.marked, 0);
  const attendedSum = out.reduce((a, r) => a + r.attended, 0);
  return Response.json({
    range,
    month,
    monthLabel: bnMonthLabel(month),
    summary: {
      students: out.length,
      attendedSum,
      markedSum,
      avgRate: markedSum > 0 ? Math.round((attendedSum / markedSum) * 100) : 0,
      totalDue: out.reduce((a, r) => a + r.feeDue, 0),
      dueStudents: out.filter((r) => r.feeDue > 0).length,
    },
    rows: out,
  });
}
