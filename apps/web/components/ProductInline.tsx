"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { ProductDetail } from "@/types/api";

// 세션 내 상품명 캐시 — 문의/거래 목록에서 같은 상품 반복 조회 방지.
const nameCache = new Map<string, string>();

/** 상품 id 만 있는 목록(문의/거래 등)에서 상품명을 best-effort 로 보여주는 링크. */
export function ProductInline({ productId }: { productId: string }) {
  const [name, setName] = useState<string | null>(
    nameCache.get(productId) ?? null,
  );

  useEffect(() => {
    if (name !== null) return;
    let alive = true;
    api
      .get<ProductDetail>(`/products/${productId}`, undefined)
      .then((p) => {
        nameCache.set(productId, p.name);
        if (alive) setName(p.name);
      })
      .catch(() => {
        if (alive) setName(""); // 실패 시 fallback 표시
      });
    return () => {
      alive = false;
    };
  }, [productId, name]);

  return (
    <Link
      href={`/products/${productId}`}
      className="font-medium text-slate-900 hover:underline"
    >
      {name ? name : `상품 #${productId}`}
    </Link>
  );
}
