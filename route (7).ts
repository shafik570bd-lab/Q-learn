import { db } from "@/db";
import { students, batches, classSessions } from "@/db/schema";
import { sql, eq, and, desc } from "drizzle-orm";
import { classPosts } from "@/db/schema";
import { apiUser } from "@/lib/auth";
import { todayLocal, currentMonth, bnMonthLabel } from "@/lib/format";

export const dynamic = "force-dynamic";
const num = (v: unknown) => Number(v ?? 0);
const p = (x: number) => String(x).padStart(2, "0");
const isoOf = (d: Date) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;

export async function GET() {
  const { user, error } = await apiUser("student");
  if (error) return error;

  const [st] = await db.select().from(students).where(eq(students.userId, user.id)).limit(1);
  if (!st) return Response.json({ error: "শিক্ষার্থী প্রোফাইল নেই" }, { status: 404 });

  const [batch] = await db.select().from(batches).where(eq(batches.id, st.batchId)).limit(1);
  const teacherRow = batch
    ? (await db.execute(sql`select id, coalesce(name_bn, name) as bn, avatar_color, subject, phone from users where id = ${batch.teacherId}`)).rows[0] as Record<string, unknown>
    : null;

  const today = todayLocal();
  const month = currentMonth();

  const [att] = (await db.execute(sql`
    select
      count(*) filter (where status = 'present')::int as present,
      count(*) filter (where status = 'late')::int as late,
      count(*) filter (where status = 'absent')::int as absent,
      count(*)::int as total
    from attendance where student_id = ${st.id}
  `)).rows as Record<string, unknown>[];

  const present = num(att.present), late = num(att.late), absent = num(att.absent), total = num(att.total);
  const monthSessions = num(((await db.execute(sql`
    select count(*)::int as n from class_sessions where batch_id = ${st.batchId} and date like ${month + "-%"}
  `)).rows as Record<string, unknown>[])[0]?.n);
  const allSessions = num(((await db.execute(sql`
    select count(*)::int as n from class_sessions where batch_id = ${st.batchId}
  `)).rows as Record<string, unknown>[])[0]?.n);

  // Fees: current month + previous cleared?
  const feeRows = (await db.execute(sql`
    select month, amount, paid, paid_on, method from fees
    where student_id = ${st.id} order by month desc limit 2
  `)).rows as Record<string, unknown>[];
  const curFee = feeRows.find((f) => String(f.month) === month) ?? null;
  const prevFee = feeRows.find((f) => String(f.month) !== month) ?? null;
  const feeAmount = curFee ? num(curFee.amount) : Math.max(0, (batch?.monthlyFee ?? 0) - st.discount);
  const feePaid = curFee ? num(curFee.paid) : 0;
  const feeDue = Math.max(0, feeAmount - feePaid);

  // Latest meet post (pinned-first, then newest), plus the feed
  const posts = await db.select().from(classPosts)
    .where(and(
      eq(classPosts.batchId, st.batchId),
      sql`(${classPosts.studentId} is null or ${classPosts.studentId} = ${st.id})`,
    ))
    .orderBy(desc(classPosts.createdAt))
    .limit(24);
  const teacherIds = [...new Set(posts.map((x) => x.teacherId))];
  const tNames = teacherIds.length
    ? new Map(((await db.execute(sql`select id, coalesce(name_bn,name) as bn from users where id in (${sql.join(teacherIds.map((i) => sql`${i}`), sql`, `)})`)).rows as Record<string, unknown>[]).map((r) => [num(r.id), String(r.bn)]))
    : new Map<number, string>();
  const feed = posts
    .map((r) => ({
      id: r.id, kind: r.kind, meetUrl: r.meetUrl, message: r.message,
      pinned: r.pinned,
      teacherBn: tNames.get(r.teacherId) || "শিক্ষক",
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 20);
  const latestMeet = feed.find((f) => f.kind === "meet") ?? null;

  // Last 35 days attendance dots
  const calRows = (await db.execute(sql`
    select date, status from attendance
    where student_id = ${st.id} and date >= ${isoOf(new Date(Date.now() - 34 * 86400000))}
    order by date
  `)).rows as Record<string, unknown>[];
  const calMap = new Map(calRows.map((r) => [String(r.date), String(r.status)]));
  const calendar = Array.from({ length: 35 }, (_, i) => {
    const d = new Date(Date.now() - (34 - i) * 86400000);
    const key = isoOf(d);
    return { date: key, day: d.getDate(), status: calMap.get(key) ?? null };
  });

  return Response.json({
    profile: {
      id: st.id,
      code: st.code,
      name: user.name,
      nameBn: user.nameBn,
      phone: user.phone,
      avatarColor: user.avatarColor,
      guardian: st.guardian,
      guardianPhone: st.guardianPhone,
      joinedAt: st.joinedAt,
      batchBn: batch?.nameBn ?? "",
      batchSubject: batch?.subject ?? "",
      schedule: batch?.schedule ?? "",
      room: batch?.room ?? "",
      teacher: teacherRow
        ? { nameBn: String(teacherRow.bn), subject: String(teacherRow.subject || ""), phone: String(teacherRow.phone || ""), avatarColor: String(teacherRow.avatar_color) }
        : null,
    },
    stats: {
      present, late, absent, total,
      rate: total > 0 ? Math.round(((present + late) / total) * 100) : null,
      completedClasses: present + late,
      allSessions,
      monthSessions,
    },
    fee: {
      month, monthLabel: bnMonthLabel(month), amount: feeAmount, paid: feePaid, due: feeDue,
      status: feeDue === 0 ? "paid" : feePaid > 0 ? "partial" : "due",
      prev: prevFee ? { month: String(prevFee.month), due: Math.max(0, num(prevFee.amount) - num(prevFee.paid)) } : null,
    },
    latestMeet,
    feed,
    calendar,
  });
}
