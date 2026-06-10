"use client";

import { Pill } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ProductInline } from "@/components/ProductInline";
import {
  DEAL_STATUS_LABEL,
  DEAL_STATUS_TONE,
  formatDateTime,
  formatPrice,
} from "@/lib/format";
import type { Deal, DealStatus } from "@/types/api";

interface Props {
  deal: Deal;
  role: "buyer" | "seller";
  busy: boolean;
  reviewed: boolean;
  onStatus: (next: DealStatus) => void;
  /** 취소(파괴적) — 확인 모달을 연다 */
  onCancel: () => void;
  /** 구매자 전용 — 완료 거래 리뷰 작성 */
  onReview?: () => void;
}

export function DealCard({
  deal,
  role,
  busy,
  reviewed,
  onStatus,
  onCancel,
  onReview,
}: Props) {
  const showActions =
    deal.status === "REQUESTED" ||
    deal.status === "IN_PROGRESS" ||
    (role === "buyer" && deal.status === "COMPLETED");

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <ProductInline productId={deal.productId} />
        <Pill tone={DEAL_STATUS_TONE[deal.status]}>
          {DEAL_STATUS_LABEL[deal.status]}
        </Pill>
      </div>

      <div className="flex items-baseline justify-between gap-2">
        <span className="text-lg font-semibold text-slate-900">
          {formatPrice(deal.finalPrice)}
        </span>
        <span className="text-xs text-slate-400">
          {formatDateTime(deal.createdAt)}
        </span>
      </div>
      {deal.completedAt && (
        <p className="text-xs text-emerald-600">
          완료 {formatDateTime(deal.completedAt)}
        </p>
      )}

      {showActions && (
        <div className="flex flex-wrap justify-end gap-2">
          {deal.status === "REQUESTED" && (
            <Button
              variant="primary"
              onClick={() => onStatus("IN_PROGRESS")}
              disabled={busy}
            >
              거래 시작
            </Button>
          )}
          {deal.status === "IN_PROGRESS" && (
            <Button
              variant="primary"
              onClick={() => onStatus("COMPLETED")}
              disabled={busy}
            >
              거래 완료
            </Button>
          )}
          {(deal.status === "REQUESTED" || deal.status === "IN_PROGRESS") && (
            <Button variant="danger" onClick={onCancel} disabled={busy}>
              취소
            </Button>
          )}
          {role === "buyer" &&
            deal.status === "COMPLETED" &&
            (reviewed ? (
              <Button variant="secondary" disabled>
                리뷰 완료
              </Button>
            ) : (
              <Button variant="secondary" onClick={onReview} disabled={busy}>
                리뷰 작성
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
