import {
  pgTable,
  serial,
  text,
  integer,
  timestamp,
  boolean,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/* ─────────────────────────────────────────────────────────────
   কোচিং ম্যানেজার — Live Database Schema
   Designed for instant realtime sync (SSE push + polling fallback)
   across Admin, Teacher and Student clients.
   ───────────────────────────────────────────────────────────── */

export const users = pgTable(
  "users",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    nameBn: text("name_bn").notNull().default(""),
    email: text("email").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    role: text("role").notNull(), // 'admin' | 'teacher' | 'student'
    phone: text("phone").notNull().default(""),
    subject: text("subject").notNull().default(""), // teachers: their subject
    designation: text("designation").notNull().default(""),
    avatarColor: text("avatar_color").notNull().default("#2f6bff"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ emailIdx: index("users_email_idx").on(t.email) })
);

export const batches = pgTable(
  "batches",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(), // e.g. "HSC বিজ্ঞান ব্যাচ A"
    nameBn: text("name_bn").notNull().default(""),
    subject: text("subject").notNull(),
    schedule: text("schedule").notNull().default(""), // e.g. "শনি·সোম·বুধ · ৬:০০ PM"
    room: text("room").notNull().default(""),
    monthlyFee: integer("monthly_fee").notNull().default(1500),
    capacity: integer("capacity").notNull().default(40),
    teacherId: integer("teacher_id")
      .notNull()
      .references(() => users.id),
    status: text("status").notNull().default("active"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({ teacherIdx: index("batches_teacher_idx").on(t.teacherId) })
);

export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .unique()
      .references(() => users.id),
    code: text("code").notNull().unique(), // STU-2401
    guardian: text("guardian").notNull().default(""),
    guardianPhone: text("guardian_phone").notNull().default(""),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id),
    discount: integer("discount").notNull().default(0),
    joinedAt: text("joined_at").notNull().default(""), // YYYY-MM-DD
  },
  (t) => ({
    batchIdx: index("students_batch_idx").on(t.batchId),
    codeIdx: index("students_code_idx").on(t.code),
  })
);

export const attendance = pgTable(
  "attendance",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    date: text("date").notNull(), // YYYY-MM-DD
    status: text("status").notNull().default("present"), // present | late | absent
    markedBy: integer("marked_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    unq: uniqueIndex("attendance_student_date").on(t.studentId, t.date),
    dateIdx: index("attendance_date_idx").on(t.date),
  })
);

export const classSessions = pgTable(
  "class_sessions",
  {
    id: serial("id").primaryKey(),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id),
    teacherId: integer("teacher_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull().default("নিয়মিত ক্লাস"),
    date: text("date").notNull(), // YYYY-MM-DD
    durationMin: integer("duration_min").notNull().default(60),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    batchDateIdx: index("sessions_batch_date_idx").on(t.batchId, t.date),
  })
);

export const classPosts = pgTable(
  "class_posts",
  {
    id: serial("id").primaryKey(),
    teacherId: integer("teacher_id")
      .notNull()
      .references(() => users.id),
    batchId: integer("batch_id")
      .notNull()
      .references(() => batches.id),
    studentId: integer("student_id").references(() => students.id), // null → পুরো ব্যাচকে
    kind: text("kind").notNull().default("note"), // 'meet' | 'note'
    meetUrl: text("meet_url").notNull().default(""),
    message: text("message").notNull().default(""),
    pinned: boolean("pinned").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    batchIdx: index("posts_batch_idx").on(t.batchId),
    createdIdx: index("posts_created_idx").on(t.createdAt),
  })
);

export const fees = pgTable(
  "fees",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    month: text("month").notNull(), // YYYY-MM
    amount: integer("amount").notNull(),
    paid: integer("paid").notNull().default(0),
    paidOn: text("paid_on").notNull().default(""),
    method: text("method").notNull().default(""), // cash | bkash | nagad | bank
  },
  (t) => ({
    unq: uniqueIndex("fees_student_month").on(t.studentId, t.month),
    monthIdx: index("fees_month_idx").on(t.month),
  })
);

export const studyGoals = pgTable(
  "study_goals",
  {
    id: serial("id").primaryKey(),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id),
    title: text("title").notNull(),
    sort: integer("sort").notNull().default(0),
  },
  (t) => ({ studentIdx: index("study_goals_student_idx").on(t.studentId) })
);

export const studyChecks = pgTable(
  "study_checks",
  {
    id: serial("id").primaryKey(),
    goalId: integer("goal_id")
      .notNull()
      .references(() => studyGoals.id),
    date: text("date").notNull(), // YYYY-MM-DD
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    unq: uniqueIndex("study_checks_goal_date").on(t.goalId, t.date),
    dateIdx: index("study_checks_date_idx").on(t.date),
  })
);

export type Role = "admin" | "teacher" | "student";
