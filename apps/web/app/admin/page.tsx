"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  AdminBusinessInfoList,
  AdminMemberList,
  AdminProductList,
} from "@/types/api";

interface Summary {
  pendingBiz: number | null;
  pendingProducts: number | null;
  totalMembers: number | null;
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<Summary>({
    pendingBiz: null,
    pendingProducts: null,
    totalMembers: null,
  });

  useEffect(() => {
    let alive = true;
    void (async () => {
      const [biz, prod, mem] = await Promise.allSettled([
        api.get<AdminBusinessInfoList>("/admin/business-info", {
          status: "PENDING",
        }),
        api.get<AdminProductList>("/admin/products", { status: "PENDING" }),
        api.get<AdminMemberList>("/admin/members", { size: 1 }),
      ]);
      if (!alive) return;
      setSummary({
        pendingBiz: biz.status === "fulfilled" ? biz.value.total : null,
        pendingProducts: prod.status === "fulfilled" ? prod.value.total : null,
        totalMembers: mem.status === "fulfilled" ? mem.value.total : null,
      });
    })();
    return () => {
      alive = false;
    };
  }, []);

  const cards = [
    {
      label: "사업자 인증 심사 대기",
      value: summary.pendingBiz,
      href: "/admin/business-info",
      accent: "text-amber-600",
    },
    {
      label: "상품 검수 대기 (PENDING)",
      value: summary.pendingProducts,
      href: "/admin/products",
      accent: "text-amber-600",
    },
    {
      label: "전체 회원",
      value: summary.totalMembers,
      href: "/admin/members",
      accent: "text-slate-900",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
        >
          <span className="text-sm text-slate-500">{c.label}</span>
          <span className={`text-3xl font-bold ${c.accent}`}>
            {c.value === null ? "—" : c.value.toLocaleString("ko-KR")}
          </span>
          <span className="text-xs text-slate-400">바로가기 ›</span>
        </Link>
      ))}
    </div>
  );
}
