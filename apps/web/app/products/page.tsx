"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/components/ProductCard";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { inputClass } from "@/components/FormField";
import type { ProductList } from "@/types/api";

const PAGE_SIZE = 12;

function ProductListView() {
  const router = useRouter();
  const search = useSearchParams();
  const keyword = search.get("keyword") ?? "";
  const page = Math.max(1, Number(search.get("page") ?? "1") || 1);

  const [data, setData] = useState<ProductList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState(keyword);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ProductList>("/products", {
        page,
        size: PAGE_SIZE,
        keyword: keyword || undefined,
      });
      setData(res);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "상품을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, keyword]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setInput(keyword);
  }, [keyword]);

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (input.trim()) params.set("keyword", input.trim());
    router.push(`/products${params.size ? `?${params}` : ""}`);
  };

  const setPage = (next: number) => {
    const params = new URLSearchParams(search.toString());
    if (next === 1) params.delete("page");
    else params.set("page", String(next));
    router.push(`/products${params.size ? `?${params}` : ""}`);
  };

  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">상품</h1>
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            type="search"
            placeholder="상품명·모델명으로 검색"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className={`${inputClass} flex-1`}
            aria-label="상품 검색"
          />
          <Button type="submit" variant="primary">
            검색
          </Button>
          {keyword && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/products")}
            >
              초기화
            </Button>
          )}
        </form>
        {!loading && data && (
          <p className="text-xs text-slate-500">
            총 {total.toLocaleString("ko-KR")}건
            {keyword && ` · "${keyword}" 검색`}
          </p>
        )}
      </header>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="상품을 불러오지 못했습니다"
          description={error}
          action={
            <Button onClick={() => void load()} variant="secondary">
              다시 시도
            </Button>
          }
        />
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          title="조건에 맞는 상품이 없습니다."
          description={
            keyword
              ? "검색어를 바꾸거나 초기화해 보세요."
              : "아직 등록된 상품이 없습니다."
          }
          action={
            keyword ? (
              <Button
                variant="secondary"
                onClick={() => router.push("/products")}
              >
                필터 초기화
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>

          {lastPage > 1 && (
            <div className="mt-2 flex items-center justify-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                이전
              </Button>
              <span className="px-2 text-sm text-slate-600">
                {page} / {lastPage}
              </span>
              <Button
                variant="secondary"
                onClick={() => setPage(page + 1)}
                disabled={page >= lastPage}
              >
                다음
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <ProductListView />
    </Suspense>
  );
}
