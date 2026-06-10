"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useMember } from "@/lib/auth-client";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { FormField, textareaClass } from "@/components/FormField";
import type { Inquiry } from "@/types/api";

/**
 * 상품 상세의 문의 CTA. 비로그인은 로그인으로 유도, 구매자만 문의 가능.
 * 전송 성공 시 내 문의 목록으로 이동한다.
 */
export function InquiryButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const { member } = useMember();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isNonBuyer = Boolean(member && member.role !== "BUYER");

  const onClick = () => {
    if (!member) {
      router.push(
        `/login?next=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }
    setOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.post<Inquiry>("/inquiries", {
        productId: Number(productId),
        message: message.trim() || undefined,
      });
      setOpen(false);
      router.push("/buyer/inquiries");
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "문의 전송 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        className={className}
        onClick={onClick}
        disabled={isNonBuyer}
        title={isNonBuyer ? "구매자 전용 기능입니다." : undefined}
      >
        문의 / 견적
      </Button>

      <Modal
        open={open}
        title="문의하기"
        onClose={() => !submitting && setOpen(false)}
      >
        <form onSubmit={submit} className="flex flex-col gap-3">
          <FormField
            label="문의 내용"
            htmlFor="inquiry-message"
            hint="재고·A/S·배송 등 궁금한 점을 남겨 주세요. (선택)"
          >
            <textarea
              id="inquiry-message"
              className={textareaClass}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              disabled={submitting}
            />
          </FormField>

          {error && (
            <div
              className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
              role="alert"
            >
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" loading={submitting}>
              문의 보내기
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
