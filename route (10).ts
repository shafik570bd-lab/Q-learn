import { db } from "@/db";
import { fees, students, batches } from "@/db/schema";
import { sql, and, eq } from "drizzle-orm";
import { apiUser } from "@/lib/auth";
import { publish } from "@/lib/events";
import { todayLocal, currentMonth } from "@/lib/format";

export const dynamic = "force-dynamic";
const num = (v: unknown) => Number(v ?? 0);

export async function GET(req: Request) {
  const { user, error } = await apiUser("admin", "teacher");
  if (error) return error;

  const url = new URL(req.url);
  const month = url.searchParams.get("month") || currentMonth();
  const status = url.searchParams.get("status") || "all";
  const q = (url.searchParams.get("q") || "").trim();

  const conds = [sql`f.month = ${month}`];
  if (status === "due") conds.push(sql`f.amount > f.paid and f.paid = 0`);
  else if (status === "partial") conds.push(sql`f.paid > 0 and f.amount > f.paid`);
  else if (status === "paid") conds.push(sql`f.amount <= f.paid`);
  if (q) {
    const like = `%${q}%`;
    conds.push(sql`(u.name_bn ilike ${like} or u.name ilike ${like} or s.code ilike ${like})`);
  }
  const where = sql.join(conds, sql` and `);

  const rows = (await db.execute(sql`
    select f.id as fee_id, f.student_id, f.amount, f.paid, f.paid_on, f.method,
           s.code, s.discount, u.name, u.name_bn, u.avatar_color, u.phone,
           b.name_bn as batch_bn
    from fees f
    join students s on s.id = f.student_id
    join users u on u.id = s.user_id
    join batches b on b.id = s.batch_id
    where ${where}
    order by (f.amount - f.paid) desc, u.name_bn
    limit 400
  `)).rows as Record<string, unknown>[];

  const [sum] = (await db.execute(sql`
    select
      coalesce(sum(f.paid), 0)::int as collected,
      coalesce(sum(f.amount - f.paid) filter (where f.amount > f.paid), 0)::int as due_total,
      count(*) filter (where f.amount > f.paid)::int as due_count,
      count(*) filter (where f.paid > 0 and f.amount > f.paid)::int as partial_count,
      count(*) filter (where f.amount <= f.paid)::int as paid_count,
      coalesce(sum(f.amount), 0)::int as expected
    from fees f where f.month = ${month}
  `)).rows as Record<string, unknown>[];

  return Response.json({
    month,
    summary: {
      collected: num(sum.collected),
      dueTotal: num(sum.due_total),
      dueCount: num(sum.due_count),
      partialCount: num(sum.partial_count),
      paidCount: num(sum.paid_count),
      expected: num(sum.expected),
    },
    rows: rows.map((r) => {
      const amount = num(r.amount), paid = num(r.paid);
      const due = Math.max(0, amount - paid);
      return {
        feeId: num(r.fee_id),
        studentId: num(r.student_id),
        code: String(r.code),
        name: String(r.name),
        nameBn: String(r.name_bn),
        phone: String(r.phone),
        batchBn: String(r.batch_bn),
        avatarColor: String(r.avatar_color),
        amount, paid, due,
        paidOn: String(r.paid_on),
        method: String(r.method),
        status: due === 0 ? "paid" : paid > 0 ? "partial" : "due",
      };
    }),
  });
}

export async function POST(req: Request) {
  const { user, error } = await apiUser("admin", "teacher");
  if (error) return error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "অনুরোধ সঠিক নয়" }, { status: 400 }); }

  const studentId = Number(body.studentId);
  const month = String(body.month || currentMonth());
  const amount = Math.round(Number(body.amount));
  const method = String(body.method || "bkash");
  if (!studentId || !Number.isFinite(amount) || amount <= 0) {
    return Response.json({ error: "সঠিক পরিমাণ দিন (৳)" }, { status: 400 });
  }

  const [st] = await db.select().from(students).where(eq(students.id, studentId)).limit(1);
  if (!st) return Response.json({ error: "শিক্ষার্থী নেই" }, { status: 404 });
  const [b] = await db.select().from(batches).where(eq(batches.id, st.batchId)).limit(1);

  // Ensure the month row exists, then apply payment
  const gross = b ? b.monthlyFee : 1500;
  const target = Math.max(0, gross - st.discount);
  const [existing] = await db.select().from(fees)
    .where(and(eq(fees.studentId, studentId), eq(fees.month, month))).limit(1);

  const today = todayLocal();
  if (existing) {
    await db.update(fees)
      .set({ paid: existing.paid + amount, paidOn: today, method })
      .where(eq(fees.id, existing.id));
  } else {
    await db.insert(fees).values({ studentId, month, amount: target, paid: amount, paidOn: today, method });
  }

  publish("fee", { studentId, month, amount });
  return Response.json({ ok: true });
}
