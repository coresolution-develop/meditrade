"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DealCard } from "@/components/DealCard";
import { useRequireRole } from "@/lib/auth-client";
import type { Deal, DealList, DealStatus } from "@/types/api";

export default function SellerDealsPage() {
  const { ready } = useRequireRole("SELLER");
  const [items, setItems] = useState<Deal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Deal | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    setError(null);
    try {
      const res = await api.get<DealList>("/deals", { role: "seller" });
      setItems(res.items);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "거래를 불러오지 못했습니다.",
      );
    }
  }, []);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(t);
  }, [flash]);

  const changeStatus = async (deal: Deal, next: DealStatus) => {
    setBusyId(deal.id);
    try {
      await api.patch(`/deals/${deal.id}/status`, { status: next });
      setCancelTarget(null);
      await load();
    } catch (err) {
      setFlash(
        err instanceof ApiError ? err.message : "상태 변경 중 오류가 발생했습니다.",
      );
      setCancelTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">거래 관리</h1>
        {items && (
          <p className="text-xs text-slate-500">
            총 {items.length.toLocaleString("ko-KR")}건
          </p>
        )}
      </header>

      {flash && (
        <div
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          role="status"
        >
          {flash}
        </div>
      )}

      {!ready || items === null ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : error ? (
        <EmptyState
          title="불러오지 못했습니다"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              다시 시도
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState title="거래가 없습니다." />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              role="seller"
              busy={busyId === deal.id}
              reviewed={false}
              onStatus={(next) => void changeStatus(deal, next)}
              onCancel={() => setCancelTarget(deal)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="거래를 취소할까요?"
        description="취소한 거래는 되돌릴 수 없습니다."
        confirmLabel="거래 취소"
        loading={busyId !== null && cancelTarget !== null}
        onConfirm={() => cancelTarget && void changeStatus(cancelTarget, "CANCELED")}
        onCancel={() => busyId === null && setCancelTarget(null)}
      />
    </div>
  );
}
