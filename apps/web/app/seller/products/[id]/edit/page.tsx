"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { ProductForm } from "@/components/ProductForm";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import type { ProductDetail } from "@/types/api";

interface Props {
  params: Promise<{ id: string }>;
}

export default function EditSellerProductPage({ params }: Props) {
  const { id } = use(params);
  const [data, setData] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<ProductDetail>(`/products/${id}`);
        if (!cancelled) setData(res);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError) {
          setError({ code: err.code, message: err.message });
        } else {
          setError({
            code: "INTERNAL_ERROR",
            message: "상품을 불러오지 못했습니다.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-7 w-1/3 rounded bg-slate-100" />
        <div className="h-80 rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (error?.code === "NOT_FOUND") {
    return (
      <EmptyState
        title="삭제되었거나 존재하지 않는 상품입니다."
        action={
          <Link href="/seller/products">
            <Button variant="secondary">목록으로</Button>
          </Link>
        }
      />
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        title="상품을 불러오지 못했습니다"
        description={error?.message}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">상품 수정</h1>
        <p className="mt-1 text-sm text-slate-500">
          판매중/품절 등 판매 상태를 함께 변경할 수 있습니다.
        </p>
      </header>
      <ProductForm mode="edit" initial={data} />
    </div>
  );
}
