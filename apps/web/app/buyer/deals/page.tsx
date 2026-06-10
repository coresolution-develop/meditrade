"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { DealCard } from "@/components/DealCard";
import { StarRating } from "@/components/StarRating";
import { FormField, textareaClass } from "@/components/FormField";
import { useRequireRole } from "@/lib/auth-client";
import type { Deal, DealList, DealStatus } from "@/types/api";

export default function BuyerDealsPage() {
  const { ready } = useRequireRole("BUYER");
  const [items, setItems] = useState<Deal[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Deal | null>(null);
  const [reviewTarget, setReviewTarget] = useState<Deal | null>(null);
  const [reviewed, setReviewed] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    setItems(null);
    setError(null);
    try {
      const res = await api.get<DealList>("/deals", { role: "buyer" });
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

  const submitReview = async (
    deal: Deal,
    body: { rating: number; content?: string },
  ) => {
    setBusyId(deal.id);
    try {
      await api.post("/reviews", { dealId: Number(deal.id), ...body });
      setReviewed((prev) => new Set(prev).add(deal.id));
      setFlash("리뷰를 등록했습니다.");
      setReviewTarget(null);
    } catch (err) {
      // 409(중복 / 미완료) 흡수
      setFlash(
        err instanceof ApiError ? err.message : "리뷰 등록 중 오류가 발생했습니다.",
      );
      setReviewTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">거래 내역</h1>
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
          title="거래 내역이 없습니다."
          description="견적을 받은 문의에서 거래를 생성할 수 있습니다."
          action={
            <Link href="/buyer/inquiries">
              <Button>내 문의로 이동</Button>
            </Link>
          }
        />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              role="buyer"
              busy={busyId === deal.id}
              reviewed={reviewed.has(deal.id)}
              onStatus={(next) => void changeStatus(deal, next)}
              onCancel={() => setCancelTarget(deal)}
              onReview={() => setReviewTarget(deal)}
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

      <Modal
        open={Boolean(reviewTarget)}
        title="리뷰 작성"
        onClose={() => busyId === null && setReviewTarget(null)}
      >
        {reviewTarget && (
          <ReviewForm
            submitting={busyId === reviewTarget.id}
            onSubmit={(body) => void submitReview(reviewTarget, body)}
            onCancel={() => setReviewTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function ReviewForm({
  submitting,
  onSubmit,
  onCancel,
}: {
  submitting: boolean;
  onSubmit: (body: { rating: number; content?: string }) => void;
  onCancel: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (rating < 1 || rating > 5) return setErr("별점을 선택해 주세요.");
    onSubmit({ rating, ...(content.trim() ? { content: content.trim() } : {}) });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <FormField label="별점" htmlFor="review-rating" required>
        <div id="review-rating">
          <StarRating value={rating} onChange={setRating} />
        </div>
      </FormField>
      <FormField label="후기" htmlFor="review-content" hint="거래 경험을 남겨 주세요. (선택)">
        <textarea
          id="review-content"
          className={textareaClass}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          disabled={submitting}
        />
      </FormField>

      {err && (
        <div
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          role="alert"
        >
          {err}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          취소
        </Button>
        <Button type="submit" loading={submitting}>
          등록
        </Button>
      </div>
    </form>
  );
}
