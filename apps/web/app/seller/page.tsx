"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { StarRating } from "@/components/StarRating";
import { useRequireRole } from "@/lib/auth-client";
import type {
  DealList,
  InquiryList,
  ProductList,
  SellerReviews,
} from "@/types/api";

interface Stats {
  products: number | null;
  inquiries: number | null;
  deals: number | null;
  reviews: SellerReviews | null;
}

export default function SellerDashboardPage() {
  const { member, ready } = useRequireRole("SELLER");
  const memberId = member?.id;
  const [stats, setStats] = useState<Stats>({
    products: null,
    inquiries: null,
    deals: null,
    reviews: null,
  });

  useEffect(() => {
    if (!ready || !memberId) return;
    let alive = true;
    void (async () => {
      const [p, i, d, r] = await Promise.allSettled([
        api.get<ProductList>("/products/mine", { size: 1 }),
        api.get<InquiryList>("/inquiries", { role: "seller" }),
        api.get<DealList>("/deals", { role: "seller" }),
        api.get<SellerReviews>(`/sellers/${memberId}/reviews`),
      ]);
      if (!alive) return;
      setStats({
        products: p.status === "fulfilled" ? p.value.total : null,
        inquiries: i.status === "fulfilled" ? i.value.total : null,
        deals: d.status === "fulfilled" ? d.value.total : null,
        reviews: r.status === "fulfilled" ? r.value : null,
      });
    })();
    return () => {
      alive = false;
    };
  }, [ready, memberId]);

  const cards = [
    { label: "내 상품", value: stats.products, href: "/seller/products" },
    { label: "받은 문의", value: stats.inquiries, href: "/seller/inquiries" },
    { label: "거래", value: stats.deals, href: "/seller/deals" },
  ];

  if (!ready) {
    return <div className="h-48 animate-pulse rounded-xl bg-slate-100" />;
  }

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">판매자 대시보드</h1>
        <p className="text-sm text-slate-500">{member?.name} 님</p>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm"
          >
            <span className="text-sm text-slate-500">{c.label}</span>
            <span className="text-3xl font-bold text-slate-900">
              {c.value === null ? "—" : c.value.toLocaleString("ko-KR")}
            </span>
            <span className="text-xs text-slate-400">바로가기 ›</span>
          </Link>
        ))}

        <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5">
          <span className="text-sm text-slate-500">평균 평점</span>
          {stats.reviews === null ? (
            <span className="text-3xl font-bold text-slate-900">—</span>
          ) : stats.reviews.averageRating === null ? (
            <span className="text-sm text-slate-400">아직 리뷰가 없습니다.</span>
          ) : (
            <>
              <span className="text-3xl font-bold text-slate-900">
                {stats.reviews.averageRating.toFixed(2)}
              </span>
              <span className="flex items-center gap-2 text-xs text-slate-500">
                <StarRating value={stats.reviews.averageRating} />
                리뷰 {stats.reviews.total}건
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
