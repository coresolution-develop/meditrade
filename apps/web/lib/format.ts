import type { ConditionType, ProductStatus } from "@/types/api";

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "가격 문의";
  return `₩${price.toLocaleString("ko-KR")}`;
}

export const CONDITION_LABEL: Record<ConditionType, string> = {
  NEW: "신품",
  USED: "중고",
  REFURBISHED: "리퍼",
};

export const STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "임시저장",
  PENDING: "검수 대기",
  ON_SALE: "판매중",
  SOLD_OUT: "품절",
  HIDDEN: "비공개",
};

export const ROLE_LABEL = {
  BUYER: "구매자",
  SELLER: "판매자",
  ADMIN: "관리자",
} as const;
