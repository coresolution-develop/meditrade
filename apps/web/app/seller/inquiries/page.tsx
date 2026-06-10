"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Modal } from "@/components/Modal";
import { InquiryCard } from "@/components/InquiryCard";
import { FormField, inputClass, textareaClass } from "@/components/FormField";
import { useRequireRole } from "@/lib/auth-client";
import type { CreateQuoteBody, Inquiry, InquiryList } from "@/types/api";

export default function SellerInquiriesPage() {
  const { ready } = useRequireRole("SELLER");
  const [items, setItems] = useState<Inquiry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [closeTarget, setCloseTarget] = useState<Inquiry | null>(null);
  const [quoteTarget, setQuoteTarget] = useState<Inquiry | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    setError(null);
    try {
      const res = await api.get<InquiryList>("/inquiries", { role: "seller" });
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
      setFlash(
        err instanceof ApiError ? err.message : "종료 중 오류가 발생했습니다.",
      );
      setCloseTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  const sendQuote = async (inquiry: Inquiry, body: CreateQuoteBody) => {
    setBusyId(inquiry.id);
    try {
      await api.post(`/inquiries/${inquiry.id}/quotes`, body);
      setFlash("견적을 발송했습니다.");
      setQuoteTarget(null);
      await load();
    } catch (err) {
      // 409 ILLEGAL_STATE(이미 CLOSED) 등 — 모달은 닫고 message 노출
      setFlash(
        err instanceof ApiError ? err.message : "견적 발송 중 오류가 발생했습니다.",
      );
      setQuoteTarget(null);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">받은 문의</h1>
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
        <EmptyState title="받은 문의가 없습니다." />
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((inq) => (
            <InquiryCard
              key={inq.id}
              inquiry={inq}
              role="seller"
              busy={busyId === inq.id}
              onClose={() => setCloseTarget(inq)}
              onQuote={() => setQuoteTarget(inq)}
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

      <Modal
        open={Boolean(quoteTarget)}
        title="견적 발송"
        onClose={() => busyId === null && setQuoteTarget(null)}
      >
        {quoteTarget && (
          <QuoteForm
            submitting={busyId === quoteTarget.id}
            onSubmit={(body) => void sendQuote(quoteTarget, body)}
            onCancel={() => setQuoteTarget(null)}
          />
        )}
      </Modal>
    </div>
  );
}

function QuoteForm({
  submitting,
  onSubmit,
  onCancel,
}: {
  submitting: boolean;
  onSubmit: (body: CreateQuoteBody) => void;
  onCancel: () => void;
}) {
  const [price, setPrice] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [memo, setMemo] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    const priceNum = Number(price);
    if (!price || Number.isNaN(priceNum) || priceNum < 0)
      return setErr("올바른 견적 금액을 입력해 주세요.");
    if (!validUntil) return setErr("유효기간을 선택해 주세요.");
    onSubmit({
      quotePrice: priceNum,
      validUntil,
      ...(memo.trim() ? { memo: memo.trim() } : {}),
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <FormField label="견적 금액 (원)" htmlFor="quote-price" required>
        <input
          id="quote-price"
          type="number"
          className={inputClass}
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          min={0}
          disabled={submitting}
          required
        />
      </FormField>
      <FormField label="유효기간" htmlFor="quote-valid" required>
        <input
          id="quote-valid"
          type="date"
          className={inputClass}
          value={validUntil}
          onChange={(e) => setValidUntil(e.target.value)}
          disabled={submitting}
          required
        />
      </FormField>
      <FormField label="메모" htmlFor="quote-memo" hint="포함 사항·조건 등 (선택)">
        <textarea
          id="quote-memo"
          className={textareaClass}
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
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
          발송
        </Button>
      </div>
    </form>
  );
}
