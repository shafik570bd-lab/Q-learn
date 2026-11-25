import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "কোচিং ম্যানেজার — আদর্শ একাডেমী | সব হিসেব এক জায়গায়",
  description:
    "শিক্ষার্থী ভর্তি, ব্যাচ, লাইভ উপস্থিতি, ক্লাসের Google Meet/Zoom লিংক, বেতন-বাকি ও নিয়মিত পড়ার ট্র্যাকার — শিক্ষক, শিক্ষার্থী ও অ্যাডমিনের জন্য লাইভ সিঙ্কড কোচিং ম্যানেজমেন্ট অ্যাপ।",
  manifest: "/manifest.json",
  icons: { icon: "/icon.svg" },
  applicationName: "কোচিং ম্যানেজার",
};

export const viewport: Viewport = {
  themeColor: "#2f5fe0",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
