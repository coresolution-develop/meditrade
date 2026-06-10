import type { ReactNode } from "react";
import type { ConditionType, ProductStatus } from "@/types/api";
import { CONDITION_LABEL, STATUS_LABEL, type Tone } from "@/lib/format";

const conditionStyle: Record<ConditionType, string> = {
  NEW: "bg-emerald-50 text-emerald-700 border-emerald-200",
  USED: "bg-slate-100 text-slate-700 border-slate-200",
  REFURBISHED: "bg-sky-50 text-sky-700 border-sky-200",
};

const statusStyle: Record<ProductStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 border-slate-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  ON_SALE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  SOLD_OUT: "bg-rose-50 text-rose-700 border-rose-200",
  HIDDEN: "bg-slate-100 text-slate-500 border-slate-200",
};

const base =
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium";

export function ConditionBadge({ value }: { value: ConditionType }) {
  return (
    <span className={`${base} ${conditionStyle[value]}`}>
      {CONDITION_LABEL[value]}
    </span>
  );
}

export function StatusBadge({ value }: { value: ProductStatus }) {
  return (
    <span className={`${base} ${statusStyle[value]}`}>
      {STATUS_LABEL[value]}
    </span>
  );
}

export function NegotiableBadge() {
  return (
    <span className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
      협의 가능
    </span>
  );
}

// 톤 기반 범용 뱃지 — P2 상태값(사업자/문의/미팅/거래/회원)에 사용.
const toneStyle: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  amber: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-rose-50 text-rose-700 border-rose-200",
  slate: "bg-slate-100 text-slate-600 border-slate-200",
  blue: "bg-sky-50 text-sky-700 border-sky-200",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export function Pill({
  tone = "slate",
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return <span className={`${base} ${toneStyle[tone]}`}>{children}</span>;
}
