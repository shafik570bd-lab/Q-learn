/* Seed — কোচিং ম্যানেজার live demo data (idempotent: wipes + re-seeds) */
import "dotenv/config";
import { db } from "./index";
import * as s from "./schema";
import { scryptSync, randomBytes } from "crypto";

process.env.TZ = "Asia/Dhaka";

function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 32).toString("hex")}`;
}
function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rnd = mulberry32(20260724);
const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

const d = new Date();
const p = (x: number) => String(x).padStart(2, "0");
const iso = (dt: Date) => `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
const addDays = (dt: Date, n: number) => { const c = new Date(dt); c.setDate(c.getDate() + n); return c; };
const TODAY = new Date(d.getFullYear(), d.getMonth(), d.getDate());
const todayIso = iso(TODAY);
const month = todayIso.slice(0, 7);
const prevMonthDate = addDays(TODAY, -32);
const prevMonth = iso(prevMonthDate).slice(0, 7);

const COLORS = ["#2f6bff", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#f97316", "#14b8a6"];

async function main() {
  console.log("🧹 wiping existing data…");
  await db.delete(s.studyChecks);
  await db.delete(s.studyGoals);
  await db.delete(s.fees);
  await db.delete(s.classPosts);
  await db.delete(s.classSessions);
  await db.delete(s.attendance);
  await db.delete(s.students);
  await db.delete(s.batches);
  await db.delete(s.users);

  console.log("👤 users…");
  const [admin] = await db.insert(s.users).values({
    name: "Syed Shahriar", nameBn: "সৈয়দ শাহরিয়ার",
    email: "admin@coaching.com", passwordHash: hashPassword("admin123"),
    role: "admin", phone: "01711005001", designation: "প্রতিষ্ঠাতা ও পরিচালক", avatarColor: "#111827",
  }).returning();

  const teacherSeed = [
    { name: "Rakib Ahmed", bn: "রাকিব আহমেদ", email: "rakib@coaching.com", subject: "গণিত", phone: "01711005011", designation: "সিনিয়র গণিত শিক্ষক", color: "#2f6bff" },
    { name: "Muskaan Jahan", bn: "মুসকান জাহান", email: "muskan@coaching.com", subject: "ইংরেজি", phone: "01711005012", designation: "ইংরেজি বিভাগ প্রধান", color: "#10b981" },
    { name: "Jinatique Hasan", bn: "জিনাতীক হাসান", email: "jinat@coaching.com", subject: "পদার্থবিজ্ঞান", phone: "01711005013", designation: "পদার্থবিজ্ঞান শিক্ষক", color: "#f59e0b" },
    { name: "Sumaiya Mim", bn: "সুমাইয়া মিম", email: "sumaiya@coaching.com", subject: "রসায়ন", phone: "01711005014", designation: "রসায়ন শিক্ষক", color: "#8b5cf6" },
    { name: "Ariful Islam", bn: "আরিফুল ইসলাম", email: "arif@coaching.com", subject: "জীববিজ্ঞান", phone: "01711005015", designation: "জীববিজ্ঞান শিক্ষক", color: "#ef4444" },
  ];
  const teachers: Record<string, typeof admin> = {};
  for (const t of teacherSeed) {
    const [u] = await db.insert(s.users).values({
      name: t.name, nameBn: t.bn, email: t.email, passwordHash: hashPassword("teacher123"),
      role: "teacher", phone: t.phone, subject: t.subject, designation: t.designation, avatarColor: t.color,
    }).returning();
    teachers[t.email] = u;
  }
  const rakib = teachers["rakib@coaching.com"], muskan = teachers["muskan@coaching.com"],
        jinat = teachers["jinat@coaching.com"], sumaiya = teachers["sumaiya@coaching.com"],
        arif = teachers["arif@coaching.com"];

  console.log("📚 batches…");
  const batchSeed = [
    { name: "HSC Science — Physics", bn: "HSC বিজ্ঞান — পদার্থ", subject: "পদার্থবিজ্ঞান", schedule: "শনি · সোম · বুধ — সন্ধ্যা ৬:০০", room: "রুম ৩", fee: 1800, cap: 36, teacher: jinat.id },
    { name: "HSC Science — Chemistry", bn: "HSC বিজ্ঞান — রসায়ন", subject: "রসায়ন", schedule: "রবি · মঙ্গল · বৃহঃ — সন্ধ্যা ৭:০০", room: "রুম ৪", fee: 1800, cap: 34, teacher: sumaiya.id },
    { name: "SSC Batch A — Math", bn: "SSC ব্যাচ A — গণিত", subject: "গণিত", schedule: "শনি · সোম · বুধ — বিকাল ৪:০০", room: "রুম ১", fee: 1500, cap: 40, teacher: rakib.id },
    { name: "SSC Batch B — English", bn: "SSC ব্যাচ B — ইংরেজি", subject: "ইংরেজি", schedule: "রবি · মঙ্গল · বৃহঃ — বিকাল ৫:০০", room: "রুম ২", fee: 1500, cap: 38, teacher: muskan.id },
    { name: "Admission Test — Medical", bn: "ভর্তি প্রস্তুতি — মেডিকেল", subject: "জীববিজ্ঞান + বিজ্ঞান", schedule: "শুক্র · শনি — বিকেল ৩:০০", room: "রুম ৫", fee: 2500, cap: 42, teacher: arif.id },
    { name: "JSC — Class Eight", bn: "JSC — অষ্টম শ্রেণি", subject: "গণিত ও ইংরেজি", schedule: "শুক্র · রবি · মঙ্গল — সন্ধ্যা ৫:৩০", room: "রুম ৬", fee: 1200, cap: 45, teacher: rakib.id },
  ];
  const batchRows: Record<string, typeof admin & { id: number }> = {} as never;
  const batchIds: number[] = [];
  for (const b of batchSeed) {
    const [row] = await db.insert(s.batches).values({
      name: b.name, nameBn: b.bn, subject: b.subject, schedule: b.schedule,
      room: b.room, monthlyFee: b.fee, capacity: b.cap, teacherId: b.teacher, status: "active",
    }).returning();
    batchRows[b.bn] = row as never; batchIds.push(row.id);
  }
  const [bHscPhysics, bHscChem, bSscA, bSscB, bAdmission, bJsc] = batchIds;

  console.log("🎓 students…");
  const studentNames: Array<[string, string, string]> = [
    // [english, bengali, guardian]
    ["Rahim Uddin", "রাহিম উদ্দিন", "করিম উদ্দিন"], ["Tasnim Akter", "তাসনিম আক্তার", "জলিল হোসেন"],
    ["Nafis Chowdhury", "নাফিস চৌধুরী", "নাসির চৌধুরী"], ["Nusrat Jahan", "নুসরাত জাহান", "কাউছার আহমেদ"],
    ["Fahim Sheikh", "ফাহিম শেখ", "জাহাঙ্গীর শেখ"], ["Anika Tabassum", "আনিকা তাবাসসুম", "শামসুজ্জামান"],
    ["Saad Rahman", "সাদ রহমান", "আব্দুর রহমান"], ["Moushumi Akter", "মৌসুমী আক্তার", "শাহেদ আলী"],
    ["Abid Hasan", "আবিদ হাসান", "মাহফুজ হাসান"], // HSC Physics (9)
    ["Jannatul Ferdous", "জান্নাতুল ফেরদৌস", "নূরুল ইসলাম"], ["Siam Ahmed", "সিয়াম আহমেদ", "শফিকুল ইসলাম"],
    ["Mim Akter", "মিম আক্তার", "আলমগীর হোসেন"], ["Rifat Hossain", "রিফাত হোসেন", "জিয়াউর রহমান"],
    ["Lamia Sultana", "লামিয়া সুলতানা", "সালাহউদ্দিন"], ["Arman Kabir", "আরমান কবির", "বদিউজ্জামান"],
    ["Priya Das", "প্রিয়া দাস", "সুকুমার দাস"], ["Tanvir Islam", "তানভীর ইসলাম", "ফজলুল হক"],
    ["Zarin Tasnim", "জারিন তাসনিম", "মাসুদ রানা"], // HSC Chem (8)
    ["Shakib Al Hasan", "সাকিব আল হাসান", "আনিসুল হক"], ["Rabeya Khatun", "রাবেয়া খাতুন", "আফতাব উদ্দিন"],
    ["Mahir Khan", "মাহির খান", "ইউসুফ খান"], ["Sumaiya Afrin", "সুমাইয়া আফরিন", "জহির উদ্দিন"],
    ["Maruf Billah", "মারুফ বিল্লাহ", "কবির হোসেন"], ["Ornob Saha", "অয়ন সাহ", "বিজয় সাহ"],
    ["Tasnia Rahman", "তাসনিয়া রহমান", "মুজিবুর রহমান"], ["Fahmida Noor", "ফামিদা নূর", "শামসুল আলম"], // SSC A (8)
    ["Rakibul Islam", "রাকিবুল ইসলাম", "ইদ্রিস মিয়া"], ["Sumaiya Chowdhury", "সুমাইয়া চৌধুরী", "আসাদ চৌধুরী"],
    ["Mahmudul Hasan", "মাহমুদুল হাসান", "নজরুল ইসলাম"], ["Maliha Tabassum", "মালিহা তাবাসসুম", "শওকত ওসমান"],
    ["Fardin Hossain", "ফার্দিন হোসেন", "শামসুল হক"], ["Sadia Islam", "সাদিয়া ইসলাম", "আশরাফুল ইসলাম"],
    ["Ikramul Haque", "ইকরামুল হক", "বেলায়েত হোসেন"], // SSC B (7)
    ["Anik Sarker", "আনিক সরকার", "বাবলু সরকার"], ["Tania Akter", "তানিয়া আক্তার", "রফিক উদ্দিন"],
    ["Sajidul Islam", "সাজিদুল ইসলাম", "কামরুল ইসলাম"], ["Mehnaz Sultana", "মেহনাজ সুলতানা", "সরফরাজ হোসেন"],
    ["Nahid Hasan", "নাহিদ হাসান", "ফরিদ হোসেন"], ["Riya Mondal", "রিয়া মণ্ডল", "সুবল মণ্ডল"],
    ["Nabila Noor", "নাবিলা নূর", "তৌফিক উদ্দিন"], ["Hasib Mahmud", "হাসিব মাহমুদ", "শাহাদাত হোসেন"], // Admission (8)
    ["Zayan Ahmed", "জায়ান আহমেদ", "ফারুক আহমেদ"], ["Mim Islam", "মিম ইসলাম", "জিল্লুর রহমান"],
    ["Samiul Hasan", "সামিউল হাসান", "মাহমুদ হাসান"], ["Lamisa Haque", "লামিসা হক", "আখতার হোসেন"],
    ["Tanzim Khan", "তানজিম খান", "রুহুল আমীন"], ["Moumita Rani", "মৌমিতা রাণী", "নির্মল রাণী"], // JSC (6)
  ];
  const batchAssign = [
    bHscPhysics, bHscPhysics, bHscPhysics, bHscPhysics, bHscPhysics, bHscPhysics, bHscPhysics, bHscPhysics, bHscPhysics,
    bHscChem, bHscChem, bHscChem, bHscChem, bHscChem, bHscChem, bHscChem, bHscChem,
    bSscA, bSscA, bSscA, bSscA, bSscA, bSscA, bSscA, bSscA,
    bSscB, bSscB, bSscB, bSscB, bSscB, bSscB, bSscB,
    bAdmission, bAdmission, bAdmission, bAdmission, bAdmission, bAdmission, bAdmission, bAdmission,
    bJsc, bJsc, bJsc, bJsc, bJsc, bJsc, bJsc,
  ];
  const batchFee: Record<number, number> = {};
  for (const b of batchSeed) batchFee[b.teacher] = b.fee;
  const feeOf = (batchId: number) =>
    batchId === bHscPhysics || batchId === bHscChem ? 1800 :
    batchId === bSscA || batchId === bSscB ? 1500 :
    batchId === bAdmission ? 2500 : 1200;

  const students: Array<{ id: number; batchId: number; discount: number }> = [];
  let i = 0;
  for (const [en, bn, guardian] of studentNames) {
    i += 1;
    const code = `STU-${2400 + i}`;
    const batchId = batchAssign[i - 1];
    const discount = rnd() < 0.22 ? pick([200, 300, 500]) : 0;
    const joined = addDays(TODAY, -Math.floor(rnd() * 340) - 20);
    const [u] = await db.insert(s.users).values({
      name: en, nameBn: bn,
      email: `${code.toLowerCase().replace("-", "")}@student.coaching.com`,
      passwordHash: hashPassword("student123"),
      role: "student", phone: `018${String(10000000 + Math.floor(rnd() * 89999999))}`,
      designation: "", avatarColor: COLORS[i % COLORS.length],
    }).returning();
    const [st] = await db.insert(s.students).values({
      userId: u.id, code, guardian, guardianPhone: `017${String(10000000 + Math.floor(rnd() * 89999999))}`,
      batchId, discount, joinedAt: iso(joined),
    }).returning();
    students.push({ id: st.id, batchId, discount });
  }

  console.log("🗓️ attendance (past 34 days)…");
  const attRows: Array<{ studentId: number; date: string; status: string; markedBy: number }> = [];
  for (let back = 33; back >= 0; back--) {
    const date = iso(addDays(TODAY, -back));
    for (const st of students) {
      if (back === 0 && rnd() < 0.18) continue; // a few today left unmarked
      const r = rnd();
      const status = r < 0.85 ? "present" : r < 0.93 ? "late" : "absent";
      const batch = batchSeed.find((_, idx) => batchIds[idx] === st.batchId);
      void batch;
      attRows.push({ studentId: st.id, date, status, markedBy: jinat.id });
    }
  }
  // chunked insert
  const CH = 400;
  for (let k = 0; k < attRows.length; k += CH) {
    await db.insert(s.attendance).values(attRows.slice(k, k + CH)).onConflictDoNothing();
  }

  console.log("📖 class sessions…");
  for (const bid of batchIds) {
    const teacherId = bid === bHscPhysics ? jinat.id : bid === bHscChem ? sumaiya.id : bid === bSscA ? rakib.id : bid === bSscB ? muskan.id : bid === bAdmission ? arif.id : rakib.id;
    for (let back = 27; back >= 0; back -= 3 + Math.floor(rnd() * 2)) {
      await db.insert(s.classSessions).values({
        batchId: bid, teacherId, title: pick(["নিয়মিত ক্লাস", "লেকচার + সমস্যা সমাধান", "মডেল টেস্ট রিভিউ", "এক্সট্রা ক্লাস"]),
        date: iso(addDays(TODAY, -back)), durationMin: pick([60, 75, 90]),
      }).onConflictDoNothing();
    }
  }

  console.log("📣 class posts (meet links + notes)…");
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600 * 1000);
  await db.insert(s.classPosts).values([
    { teacherId: jinat.id, batchId: bHscPhysics, studentId: null, kind: "meet",
      meetUrl: "https://meet.google.com/abc-defg-hij",
      message: "আজ সন্ধ্যার অনলাইন ক্লাস — লেকচার ৭: নিউটনের গতিসূত্র। বোর্ড বইয়ের পাতা ৫৬–৬১ শেষ করে এসো, শেষে ১০ নম্বরের কুইজ আছে।",
      pinned: true, createdAt: hoursAgo(1.5) },
    { teacherId: sumaiya.id, batchId: bHscChem, studentId: null, kind: "meet",
      meetUrl: "https://zoom.us/j/89412345678?pwd=coaching",
      message: "আগামীকালের ক্লাসে অ্যারোমেটিক যৌগের নামকরণ (অধ্যায় ১১)। অধ্যায়টি পড়া বাধ্যতামূলক, নইলে পিছিয়ে পড়বে।",
      pinned: true, createdAt: hoursAgo(4) },
    { teacherId: rakib.id, batchId: bSscA, studentId: null, kind: "note",
      meetUrl: "", message: "শনিবার সাপ্তাহিক মডেল টেস্ট — পূর্ণমান ১৫। যার বেতন বাকি আছে, পরীক্ষার আগে মিটিয়ে ফেলবে।",
      pinned: false, createdAt: hoursAgo(7) },
    { teacherId: muskan.id, batchId: bSscB, studentId: null, kind: "note",
      meetUrl: "", message: "বাড়ির কাজ: “The Liberation War of Bangladesh” শীর্ষক অনুচ্ছেদ (২০০ শব্দ) আগামীকাল জমা দেবে। বানানে যত্ন নেবে।",
      pinned: false, createdAt: hoursAgo(26) },
    { teacherId: arif.id, batchId: bAdmission, studentId: null, kind: "note",
      meetUrl: "", message: "মেডিকেল ভর্তি মডেল টেস্ট — আসছে শুক্রবার, সকাল ১০টা। বিগত ১০ বছরের প্রশ্ন থেকে ৭০% আসবে। সিট সীমিত, সিরিয়ালে এসো।",
      pinned: false, createdAt: hoursAgo(30) },
  ]);

  console.log("💳 fees…");
  for (const st of students) {
    const gross = feeOf(st.batchId);
    const amount = gross - st.discount;
    // current month: mixed states
    const r = rnd();
    const paidThis = r < 0.55 ? amount : r < 0.78 ? Math.floor(amount * 0.5) : 0;
    await db.insert(s.fees).values({
      studentId: st.id, month, amount, paid: paidThis,
      paidOn: paidThis > 0 ? iso(addDays(TODAY, -Math.floor(rnd() * 12) - 1)) : "",
      method: paidThis > 0 ? pick(["bkash", "nagad", "cash", "bkash", "nagad"]) : "",
    }).onConflictDoNothing();
    // previous month: fully paid (history)
    await db.insert(s.fees).values({
      studentId: st.id, month: prevMonth, amount, paid: amount,
      paidOn: iso(addDays(TODAY, -36)), method: pick(["bkash", "nagad", "cash"]),
    }).onConflictDoNothing();
  }

  console.log("✅ study goals + checks…");
  const goalTitles = [
    "আজকের ক্লাসের নোট রিভিশন",
    "বইয়ের পড়া শেষ করি",
    "৩০ মিনিট গণিত/অনুশীলন সমস্যা",
    "মডেল টেস্ট বা অধ্যায় কুইজ",
    "ভুলগুলো নোট করে রিভিউ করি",
  ];
  const demoStudentIds = students.slice(0, 9).map((x) => x.id); // HSC Physics demo crew
  const goalIdByStudent: Record<number, number[]> = {};
  for (const st of students) {
    const ids: number[] = [];
    let gIdx = 0;
    for (const title of goalTitles) {
      const [g] = await db.insert(s.studyGoals).values({ studentId: st.id, title, sort: gIdx++ }).returning();
      ids.push(g.id);
    }
    goalIdByStudent[st.id] = ids;
  }
  const checkRows: Array<{ goalId: number; date: string }> = [];
  for (const st of students) {
    const isDemo = demoStudentIds.includes(st.id);
    const consistency = isDemo ? 0.85 : 0.35 + rnd() * 0.5;
    for (let back = 12; back >= 0; back--) {
      const date = iso(addDays(TODAY, -back));
      for (const gid of goalIdByStudent[st.id]) {
        if (rnd() < consistency) checkRows.push({ goalId: gid, date });
      }
    }
  }
  // guarantee the demo student (STU-2401) looks great today
  const demoFirst = goalIdByStudent[students[0].id];
  for (let k = 0; k < 3; k++) {
    const exists = checkRows.some((r) => r.goalId === demoFirst[k] && r.date === todayIso);
    if (!exists) checkRows.push({ goalId: demoFirst[k], date: todayIso });
  }
  for (let k = 0; k < checkRows.length; k += CH) {
    await db.insert(s.studyChecks).values(checkRows.slice(k, k + CH)).onConflictDoNothing();
  }

  console.log(`✔ seed complete — admin: admin@coaching.com/admin123 · teachers: *@coaching.com/teacher123 · students: stu2401@student.coaching.com/student123 (any STU-XXXX)`);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
