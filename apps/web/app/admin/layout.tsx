"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRequireRole } from "@/lib/auth-client";

const NAV = [
  { href: "/admin", label: "대시보드" },
  { href: "/admin/business-info", label: "사업자 인증 심사" },
  { href: "/admin/products", label: "상품 검수" },
  { href: "/admin/categories", label: "카테고리" },
  { href: "/admin/manufacturers", label: "제조사" },
  { href: "/admin/members", label: "회원" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { ready } = useRequireRole("ADMIN");
  const pathname = usePathname();

  if (!ready) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">관리자 콘솔</h1>
      <nav className="flex flex-wrap gap-1 border-b border-slate-200 pb-2 text-sm">
        {NAV.map((n) => {
          const active =
            n.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-md px-3 py-1.5 transition ${
                active
                  ? "bg-slate-900 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {n.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
