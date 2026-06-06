"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import {
  ConditionBadge,
  NegotiableBadge,
  StatusBadge,
} from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { formatPrice } from "@/lib/format";
import type { ProductList, ProductListItem } from "@/types/api";

const FETCH_SIZE = 200;

export default function SellerProductsPage() {
  const [items, setItems] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [targetDelete, setTargetDelete] = useState<ProductListItem | null>(
    null,
  );
  const [deleting, setDeleting] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // 백엔드 전용 엔드포인트: 토큰의 sellerId 로 본인 상품(상태 무관) 전체.
      const res = await api.get<ProductList>("/products/mine", {
        page: 1,
        size: FETCH_SIZE,
      });
      setItems(res.items);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "상품을 불러오지 못했습니다.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const onDelete = async () => {
    if (!targetDelete) return;
    setDeleting(true);
    try {
      await api.delete<{ id: string }>(`/products/${targetDelete.id}`);
      setItems((prev) => prev.filter((p) => p.id !== targetDelete.id));
      setFlash(`"${targetDelete.name}" 상품을 삭제했습니다.`);
      setTargetDelete(null);
    } catch (err) {
      setFlash(
        err instanceof ApiError
          ? err.message
          : "삭제 중 오류가 발생했습니다.",
      );
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">내 상품</h1>
        <Link href="/seller/products/new">
          <Button>상품 등록</Button>
        </Link>
      </header>

      {flash && (
        <div
          className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          role="status"
        >
          {flash}
        </div>
      )}

      {loading ? (
        <SellerListSkeleton />
      ) : error ? (
        <EmptyState
          title="상품을 불러오지 못했습니다"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              다시 시도
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="등록한 상품이 없습니다."
          description="첫 상품을 등록해 보세요."
          action={
            <Link href="/seller/products/new">
              <Button>첫 상품 등록하기</Button>
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">상품</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">가격</th>
                <th className="px-4 py-3 font-medium text-right">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <Link
                      href={`/products/${p.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {p.name}
                    </Link>
                    {p.modelName && (
                      <p className="text-xs text-slate-500">{p.modelName}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1.5">
                      <ConditionBadge value={p.conditionType} />
                      <StatusBadge value={p.status} />
                      {p.priceNegotiable && <NegotiableBadge />}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-800">
                    {formatPrice(p.price)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/seller/products/${p.id}/edit`}>
                        <Button variant="secondary">수정</Button>
                      </Link>
                      <Button
                        variant="danger"
                        onClick={() => setTargetDelete(p)}
                      >
                        삭제
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(targetDelete)}
        title="상품을 삭제할까요?"
        description={
          targetDelete
            ? `"${targetDelete.name}" 을(를) 삭제합니다. 이 동작은 되돌릴 수 없습니다.`
            : undefined
        }
        confirmLabel="삭제"
        loading={deleting}
        onConfirm={onDelete}
        onCancel={() => !deleting && setTargetDelete(null)}
      />
    </div>
  );
}

function SellerListSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="animate-pulse">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-t border-slate-100 px-4 py-4 first:border-t-0"
          >
            <div className="h-4 w-2/5 rounded bg-slate-100" />
            <div className="h-4 w-1/5 rounded bg-slate-100" />
            <div className="h-4 w-1/6 rounded bg-slate-100" />
            <div className="ml-auto h-9 w-32 rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
