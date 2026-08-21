import type { Metadata, Viewport } from "next";
import { Baloo_Bhaijaan_2, Tajawal } from "next/font/google";
import "./globals.css";

const baloo = Baloo_Bhaijaan_2({
  variable: "--font-baloo",
  subsets: ["arabic"],
  weight: ["500", "600", "700", "800"],
});

const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "التكاليف التربوية",
  description: "متابعة التكاليف التربوية للطلاب بطريقة ممتعة ومحفزة",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f7a54",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${baloo.variable} ${tajawal.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-bg text-ink antialiased">{children}</body>
    </html>
  );
}
