import type { Metadata } from "next";
import "./globals.css";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "MediTrade — 의료기기 유통 플랫폼",
  description: "검색 → 비교 → 문의 → 거래를 한 곳에서.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col bg-slate-50 text-slate-900">
        <Header />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
