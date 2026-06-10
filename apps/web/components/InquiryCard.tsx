"use client";

import { Pill } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ProductInline } from "@/components/ProductInline";
import {
  INQUIRY_STATUS_LABEL,
  INQUIRY_STATUS_TONE,
  formatDate,
  formatDateTime,
  formatPrice,
} from "@/lib/format";
import type { Inquiry } from "@/types/api";

interface Props {
  inquiry: Inquiry;
  role: "buyer" | "seller";
  busy: boolean;
  onClose: () => void;
  /** 판매자 전용 — 견적 발송 모달 열기 */
  onQuote?: () => void;
}

export function InquiryCard({ inquiry, role, busy, onClose, onQuote }: Props) {
  const closed = inquiry.status === "CLOSED";

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-start justify-between gap-2">
        <ProductInline productId={inquiry.productId} />
        <Pill tone={INQUIRY_STATUS_TONE[inquiry.status]}>
          {INQUIRY_STATUS_LABEL[inquiry.status]}
        </Pill>
      </div>

      {inquiry.message && (
        <p className="whitespace-pre-wrap text-sm text-slate-700">
          {inquiry.message}
        </p>
      )}
      <p className="text-xs text-slate-400">
        {formatDateTime(inquiry.createdAt)}
      </p>

      {inquiry.quotes.length > 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-medium text-slate-500">
            견적 {inquiry.quotes.length}건
          </p>
          {inquiry.quotes.map((q) => (
            <div
              key={q.id}
              className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm"
            >
              <span className="font-semibold text-slate-900">
                {formatPrice(q.quotePrice)}
              </span>
              <span className="text-xs text-slate-500">
                유효기간 {formatDate(q.validUntil)}
              </span>
              {q.memo && (
                <span className="w-full text-xs text-slate-600">{q.memo}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {!closed && (
        <div className="flex justify-end gap-2">
          {role === "seller" && onQuote && (
            <Button variant="primary" onClick={onQuote} disabled={busy}>
              견적 발송
            </Button>
          )}
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            종료
          </Button>
        </div>
      )}
    </div>
  );
}
