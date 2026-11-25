/* Bengali-first formatting helpers */

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Convert ASCII digits to Bengali digits: 1234 → ১২৩৪ */
export function toBn(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** 1,23,456 style grouping with ৳ and Bengali digits: ৳১,২৩,৪৫৬ */
export function moneyBn(n: number): string {
  const rounded = Math.round(n);
  const grouped = rounded.toLocaleString("en-IN");
  return `৳${toBn(grouped)}`;
}

export function taka(n: number): string {
  return `৳${Math.round(n).toLocaleString("en-IN")}`;
}

export function todayLocal(): string {
  const d = new Date();
  const p = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function currentMonth(): string {
  return todayLocal().slice(0, 7);
}

export function bnMonthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  const names = [
    "জানুয়ারি", "ফেব্রুয়ারি", "মার্চ", "এপ্রিল", "মে", "জুন",
    "জুলাই", "আগস্ট", "সেপ্টেম্বর", "অক্টোবর", "নভেম্বর", "ডিসেম্বর",
  ];
  return `${names[(m || 1) - 1]} ${toBn(y)}`;
}

export function bnDateShort(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const days = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];
  const dt = new Date(y, (m || 1) - 1, d || 1);
  return `${toBn(d)} ${bnMonthLabel(iso.slice(0, 7)).split(" ")[0]} · ${days[dt.getDay()]}`;
}

export function timeAgo(date: Date | string): string {
  const t = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - t.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "এইমাত্র";
  if (min < 60) return `${toBn(min)} মিনিট আগে`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${toBn(hr)} ঘণ্টা আগে`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${toBn(day)} দিন আগে`;
  return bnDateShort(t.toISOString().slice(0, 10));
}
