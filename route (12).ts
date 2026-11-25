import { db } from "@/db";
import { students, users, batches, fees } from "@/db/schema";
import { sql } from "drizzle-orm";
import { createHash } from "crypto";
import { hashPassword, apiUser } from "@/lib/auth";
import { publish } from "@/lib/events";
import { todayLocal, currentMonth } from "@/lib/format";

export const dynamic = "force-dynamic";
const num = (v: unknown) => Number(v ?? 0);

export async function GET(req: Request) {
  const { user, error } = await apiUser("admin", "teacher");
  if (error) return error;

  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const batchId = url.searchParams.get("batchId");
  const feeFilter = url.searchParams.get("fee") || "all";
  const month = currentMonth();

  const conds = [sql`true`];
  if (q) {
    const like = `%${q}%`;
    conds.push(sql`(u.name_bn ilike ${like} or u.name ilike ${like} or s.code ilike ${like} or s.guardian ilike ${like})`);
  }
  if (batchId) conds.push(sql`s.batch_id = ${Number(batchId)}`);
  if (feeFilter === "due") conds.push(sql`f.id is not null and f.amount > f.paid`);
  if (feeFilter === "paid") conds.push(sql`f.id is null or f.amount <= f.paid`);

  const where = sql.join(conds, sql` and `);
  const rows = (await db.execute(sql`
    select s.id, s.code, s.joined_at, s.discount, s.guardian, s.guardian_phone,
           s.batch_id, b.name_bn as batch_bn, b.subject as batch_subject,
           u.name, u.name_bn, u.phone, u.email, u.avatar_color,
           coalesce(f.amount, 0) as fee_amount, coalesce(f.paid, 0) as fee_paid,
           (select count(*) filter (where a.status in ('present','late'))::int
              from attendance a where a.student_id = s.id) as attended,
           (select count(*)::int from attendance a where a.student_id = s.id) as total_att
    from students s
    join users u on u.id = s.user_id
    join batches b on b.id = s.batch_id
    left join fees f on f.student_id = s.id and f.month = ${month}
    where ${where}
    order by s.id
    limit 300
  `)).rows as Record<string, unknown>[];

  return Response.json({
    month,
    students: rows.map((r) => {
      const attended = num(r.attended);
      const totalAtt = num(r.total_att);
      const feeAmount = num(r.fee_amount);
      const feePaid = num(r.fee_paid);
      const due = Math.max(0, feeAmount - feePaid);
      return {
        id: num(r.id),
        code: String(r.code),
        name: String(r.name),
        nameBn: String(r.name_bn),
        phone: String(r.phone),
        email: String(r.email),
        guardian: String(r.guardian),
        guardianPhone: String(r.guardian_phone),
        avatarColor: String(r.avatar_color),
        batchId: num(r.batch_id),
        batchBn: String(r.batch_bn),
        batchSubject: String(r.batch_subject),
        discount: num(r.discount),
        joinedAt: String(r.joined_at),
        feeAmount,
        feePaid,
        feeDue: due,
        feeStatus: due === 0 ? (feeAmount > 0 ? "paid" : "paid") : feePaid > 0 ? "partial" : "due",
        attended,
        totalAtt,
        rate: totalAtt > 0 ? Math.round((attended / totalAtt) * 100) : null,
      };
    }),
  });
}

export async function POST(req: Request) {
  const { user, error } = await apiUser("admin");
  if (error) return error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "অনুরোধ সঠিক নয়" }, { status: 400 }); }

  const nameBn = String(body.nameBn || "").trim();
  const name = String(body.name || "").trim() || nameBn;
  const batchId = Number(body.batchId);
  const guardian = String(body.guardian || "").trim();
  const guardianPhone = String(body.guardianPhone || "").trim();
  const phone = String(body.phone || "").trim();
  const discount = Math.max(0, Math.round(Number(body.discount || 0)));
  if (!nameBn || !batchId) {
    return Response.json({ error: "নাম (বাংলা) ও ব্যাচ আবশ্যক" }, { status: 400 });
  }
  const [batch] = await db.select().from(batches).where(sql`${batches.id} = ${batchId}`).limit(1);
  if (!batch) return Response.json({ error: "ব্যাচ পাওয়া যায়নি" }, { status: 404 });

  // Next student code: STU-XXXX
  const [maxRow] = (await db.execute(sql`select coalesce(max(cast(split_part(code, '-', 2) as int)), 2400)::int as mx from students`)).rows as Record<string, unknown>[];
  const nextNum = num(maxRow.mx) + 1;
  const code = `STU-${nextNum}`;
  const email = `stu${nextNum}@student.coaching.com`;

  const [u] = await db.insert(users).values({
    name, nameBn, email, passwordHash: hashPassword("student123"),
    role: "student", phone: phone || "", designation: "",
    avatarColor: ["#2f5fe0", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"][nextNum % 6],
  }).returning();

  const feeAmount = Math.max(0, batch.monthlyFee - discount);
  const [st] = await db.insert(students).values({
    userId: u.id, code, guardian, guardianPhone, batchId, discount, joinedAt: todayLocal(),
  }).returning();
  await db.insert(fees).values({
    studentId: st.id, month: currentMonth(), amount: feeAmount, paid: 0, paidOn: "", method: "",
  }).onConflictDoNothing();

  publish("student", { studentId: st.id, batchId });
  return Response.json({ ok: true, id: st.id, code, defaultPassword: "student123" }, { status: 201 });
}
