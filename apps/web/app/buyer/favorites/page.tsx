"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { useRequireRole } from "@/lib/auth-client";
import type { FavoriteItem, FavoriteList } from "@/types/api";

export default function FavoritesPage() {
  const { ready } = useRequireRole("BUYER");
  const [items, setItems] = useState<FavoriteItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<FavoriteList>("/favorites");
      setItems(res.items);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "찜 목록을 불러오지 못했습니다.",
      );
    }
  }, []);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const remove = async (productId: string) => {
    setRemoving(productId);
    const prev = items;
    setItems((cur) => cur?.filter((f) => f.productId !== productId) ?? cur);
    try {
      await api.delete(`/favorites/${productId}`);
    } catch (err) {
      // 404(이미 해제됨)는 그대로 제거 유지, 그 외에는 롤백.
      if (!(err instanceof ApiError && err.status === 404)) {
        setItems(prev ?? null);
      }
    } finally {
      setRemoving(null);
    }
  };

  const isLoading = !ready || items === null;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">찜 목록</h1>
        {items && (
          <p className="text-xs text-slate-500">
            총 {items.length.toLocaleString("ko-KR")}건
          </p>
        )}
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          title="찜 목록을 불러오지 못했습니다"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              다시 시도
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="찜한 상품이 없습니다."
          description="상품 목록에서 마음에 드는 상품을 찜해 보세요."
          action={
            <Link href="/products">
              <Button>상품 둘러보기</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((fav) =>
            fav.product ? (
              <ProductCard
                key={fav.id}
                product={fav.product}
                actions={
                  <RemoveButton
                    busy={removing === fav.productId}
                    onRemove={() => void remove(fav.productId)}
                  />
                }
              />
            ) : (
              <DeletedFavoriteCard
                key={fav.id}
                busy={removing === fav.productId}
                onRemove={() => void remove(fav.productId)}
              />
            ),
          )}
        </div>
      )}
    </div>
  );
}

function RemoveButton({
  busy,
  onRemove,
}: {
  busy: boolean;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        // 카드 전체가 상세로 링크되므로 이동을 막는다.
        e.preventDefault();
        e.stopPropagation();
        onRemove();
      }}
      disabled={busy}
      aria-label="찜 해제"
      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
    >
      해제
    </button>
  );
}

function DeletedFavoriteCard({
  busy,
  onRemove,
}: {
  busy: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex h-full flex-col justify-between gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4">
      <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
        삭제된 상품
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">더 이상 판매하지 않는 상품입니다.</p>
        <Button variant="secondary" onClick={onRemove} loading={busy}>
          해제
        </Button>
      </div>
    </div>
  );
}
