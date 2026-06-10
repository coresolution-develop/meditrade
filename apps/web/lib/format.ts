import type {
  ConditionType,
  DealStatus,
  InquiryStatus,
  MeetingStatus,
  MeetingType,
  MemberStatus,
  ProductStatus,
  VerifyStatus,
} from "@/types/api";

export function formatPrice(price: number | null | undefined): string {
  if (price === null || price === undefined) return "가격 문의";
  return `₩${price.toLocaleString("ko-KR")}`;
}

// 상태 뱃지 색상 토큰 (components/Badge 의 Pill 과 공유)
export type Tone =
  | "green"
  | "amber"
  | "red"
  | "slate"
  | "blue"
  | "indigo";

// ── 일시/날짜 (Asia/Seoul) ──────────────────────────────────────────
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
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

// ── Phase 2 상태 라벨 + 톤 ──────────────────────────────────────────
export const VERIFY_STATUS_LABEL: Record<VerifyStatus, string> = {
  PENDING: "심사 대기",
  APPROVED: "승인됨",
  REJECTED: "반려됨",
};
export const VERIFY_STATUS_TONE: Record<VerifyStatus, Tone> = {
  PENDING: "amber",
  APPROVED: "green",
  REJECTED: "red",
};

export const INQUIRY_STATUS_LABEL: Record<InquiryStatus, string> = {
  OPEN: "대기",
  QUOTED: "견적 발송",
  CLOSED: "종료",
};
export const INQUIRY_STATUS_TONE: Record<InquiryStatus, Tone> = {
  OPEN: "amber",
  QUOTED: "blue",
  CLOSED: "slate",
};

export const MEETING_TYPE_LABEL: Record<MeetingType, string> = {
  ONLINE: "온라인",
  VISIT_SELLER: "판매자 방문",
  VISIT_BUYER: "구매자 방문",
};

export const MEETING_STATUS_LABEL: Record<MeetingStatus, string> = {
  REQUESTED: "요청됨",
  ACCEPTED: "수락",
  REJECTED: "거절",
  RESCHEDULE_PROPOSED: "일정 재제안",
  CONFIRMED: "확정",
  COMPLETED: "완료",
  CANCELED: "취소",
};
export const MEETING_STATUS_TONE: Record<MeetingStatus, Tone> = {
  REQUESTED: "amber",
  ACCEPTED: "blue",
  REJECTED: "red",
  RESCHEDULE_PROPOSED: "indigo",
  CONFIRMED: "green",
  COMPLETED: "slate",
  CANCELED: "slate",
};

export const DEAL_STATUS_LABEL: Record<DealStatus, string> = {
  REQUESTED: "요청됨",
  IN_PROGRESS: "진행 중",
  COMPLETED: "완료",
  CANCELED: "취소",
};
export const DEAL_STATUS_TONE: Record<DealStatus, Tone> = {
  REQUESTED: "amber",
  IN_PROGRESS: "blue",
  COMPLETED: "green",
  CANCELED: "slate",
};

export const MEMBER_STATUS_LABEL: Record<MemberStatus, string> = {
  ACTIVE: "활성",
  SUSPENDED: "정지",
  PENDING: "대기",
};
export const MEMBER_STATUS_TONE: Record<MemberStatus, Tone> = {
  ACTIVE: "green",
  SUSPENDED: "red",
  PENDING: "amber",
};
