"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InquiryCard } from "@/components/InquiryCard";
import { useRequireRole } from "@/lib/auth-client";
import type { Inquiry, InquiryList } from "@/types/api";

export default function BuyerInquiriesPage() {
  const { ready } = useRequireRole("BUYER");
  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<Inquiry | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    setError(null);
    try {
      const res = await api.get<InquiryList>("/inquiries", { role: "buyer" });
      setItems(res.items);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "문의를 불러오지 못했습니다.",
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

  const closeInquiry = async (inquiry: Inquiry) => {
    setBusyId(inquiry.id);
    try {
      await api.patch(`/inquiries/${inquiry.id}/close`);
      setFlash("문의를 종료했습니다.");
      setCloseTarget(null);
      await load();
    } catch (err) {
      // 409 ILLEGAL_STATE(이미 CLOSED) 등은 message 노출
      setFlash(
        err instanceof ApiError ? err.message : "종료 중 오류가 발생했습니다.",
      );
      setCloseTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">내 문의·견적</h1>
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
        <EmptyState
          title="보낸 문의가 없습니다."
          description="상품 상세에서 판매자에게 문의해 보세요."
          action={
            <Link href="/products">
              <Button>상품 둘러보기</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((inq) => (
            <InquiryCard
              key={inq.id}
              inquiry={inq}
              role="buyer"
              busy={busyId === inq.id}
              onClose={() => setCloseTarget(inq)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={Boolean(closeTarget)}
        title="문의를 종료할까요?"
        description="종료한 문의는 다시 열 수 없습니다."
        confirmLabel="종료"
        loading={busyId !== null && closeTarget !== null}
        onConfirm={() => closeTarget && void closeInquiry(closeTarget)}
        onCancel={() => busyId === null && setCloseTarget(null)}
      />
    </div>
  );
}
