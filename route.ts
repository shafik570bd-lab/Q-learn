import { db } from "@/db";
import { classPosts, batches, students } from "@/db/schema";
import { sql, and, eq, desc, inArray } from "drizzle-orm";
import { apiUser } from "@/lib/auth";
import { publish } from "@/lib/events";

export const dynamic = "force-dynamic";
const num = (v: unknown) => Number(v ?? 0);

async function studentRecord(userId: number) {
  const [st] = await db.select().from(students).where(eq(students.userId, userId)).limit(1);
  return st ?? null;
}

export async function GET(req: Request) {
  const { user, error } = await apiUser("admin", "teacher", "student");
  if (error) return error;

  const url = new URL(req.url);
  const batchIdParam = url.searchParams.get("batchId");
  const limit = Math.min(50, Number(url.searchParams.get("limit") || 20));

  if (user.role === "student") {
    const st = await studentRecord(user.id);
    if (!st) return Response.json({ posts: [] });
    const rows = await db.select().from(classPosts)
      .where(and(
        eq(classPosts.batchId, st.batchId),
        sql`(${classPosts.studentId} is null or ${classPosts.studentId} = ${st.id})`,
      ))
      .orderBy(desc(classPosts.pinned), desc(classPosts.createdAt))
      .limit(limit);
    const teachers = await teacherNames(rows.map((r) => r.teacherId));
    const [b] = await db.select().from(batches).where(eq(batches.id, st.batchId)).limit(1);
    return Response.json({
      batchId: st.batchId,
      posts: rows.map((r) => ({ ...serialize(r), teacherBn: teachers.get(r.teacherId) || "", batchBn: b?.nameBn || "" })),
    });
  }

  // admin/teacher
  let batchIds: number[] | null = null;
  if (batchIdParam) {
    batchIds = [Number(batchIdParam)];
  } else if (user.role === "teacher") {
    const mine = await db.select({ id: batches.id }).from(batches).where(eq(batches.teacherId, user.id));
    batchIds = mine.map((m) => m.id);
  }
  const rows = await db.select().from(classPosts)
    .where(batchIds && batchIds.length ? inArray(classPosts.batchId, batchIds) : sql`true`)
    .orderBy(desc(classPosts.createdAt))
    .limit(limit);
  const batchNames = await batchNamesMap(rows.map((r) => r.batchId));
  const teachers = await teacherNames(rows.map((r) => r.teacherId));
  return Response.json({
    posts: rows.map((r) => ({ ...serialize(r), teacherBn: teachers.get(r.teacherId) || "", batchBn: batchNames.get(r.batchId) || "" })),
  });
}

export async function POST(req: Request) {
  const { user, error } = await apiUser("teacher", "admin");
  if (error) return error;

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return Response.json({ error: "অনুরোধ সঠিক নয়" }, { status: 400 }); }

  const batchId = Number(body.batchId);
  const meetUrl = String(body.meetUrl || "").trim();
  const message = String(body.message || "").trim();
  const pinned = Boolean(body.pinned);
  const studentIdRaw = body.studentId ? Number(body.studentId) : null;
  if (!batchId) return Response.json({ error: "ব্যাচ বেছে নিন" }, { status: 400 });
  if (!meetUrl && !message) return Response.json({ error: "লিংক অথবা বার্তা — যেকোনো একটি লিখুন" }, { status: 400 });
  if (meetUrl && !/^https?:\/\//i.test(meetUrl)) {
    return Response.json({ error: "সঠিক Meet/Zoom লিংক দিন (https://…)" }, { status: 400 });
  }
  if (user.role === "teacher") {
    const [b] = await db.select({ id: batches.id }).from(batches)
      .where(and(eq(batches.id, batchId), eq(batches.teacherId, user.id))).limit(1);
    if (!b) return Response.json({ error: "এই ব্যাচটি আপনার দায়িত্বের নয়" }, { status: 403 });
  }
  if (studentIdRaw) {
    const [st] = await db.select({ id: students.id }).from(students)
      .where(and(eq(students.id, studentIdRaw), eq(students.batchId, batchId))).limit(1);
    if (!st) return Response.json({ error: "শিক্ষার্থী এই ব্যাচে নেই" }, { status: 400 });
  }

  const [row] = await db.insert(classPosts).values({
    teacherId: user.id, batchId, studentId: studentIdRaw,
    kind: meetUrl ? "meet" : "note",
    meetUrl, message, pinned,
  }).returning();

  publish("post", { batchId, postId: row.id, kind: row.kind });
  return Response.json({ ok: true, id: row.id }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { user, error } = await apiUser("teacher", "admin");
  if (error) return error;
  const id = Number(new URL(req.url).searchParams.get("id"));
  if (!id) return Response.json({ error: "id দিন" }, { status: 400 });
  const [row] = await db.select().from(classPosts).where(eq(classPosts.id, id)).limit(1);
  if (!row) return Response.json({ error: "পোস্ট পাওয়া যায়নি" }, { status: 404 });
  if (user.role === "teacher" && row.teacherId !== user.id) {
    return Response.json({ error: "অন্য শিক্ষকের পোস্ট মুছতে পারবেন না" }, { status: 403 });
  }
  await db.delete(classPosts).where(eq(classPosts.id, id));
  publish("post", { batchId: row.batchId, deleted: id });
  return Response.json({ ok: true });
}

/* helpers */
function serialize(r: typeof classPosts.$inferSelect) {
  return {
    id: r.id, kind: r.kind, meetUrl: r.meetUrl, message: r.message,
    pinned: r.pinned, batchId: r.batchId,
    studentId: r.studentId,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
  };
}
async function teacherNames(ids: number[]) {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return new Map<number, string>();
  const rows = await db.execute(sql`select id, coalesce(name_bn, name) as bn from users where id in (${sql.join(uniq.map((i) => sql`${i}`), sql`, `)})`);
  return new Map((rows.rows as Record<string, unknown>[]).map((r) => [num(r.id), String(r.bn)]));
}
async function batchNamesMap(ids: number[]) {
  const uniq = [...new Set(ids)];
  if (!uniq.length) return new Map<number, string>();
  const rows = await db.execute(sql`select id, name_bn from batches where id in (${sql.join(uniq.map((i) => sql`${i}`), sql`, `)})`);
  return new Map((rows.rows as Record<string, unknown>[]).map((r) => [num(r.id), String(r.name_bn)]));
}
