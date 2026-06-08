/**
 * 알림 타입 코드. DB 컬럼은 VARCHAR(40).
 * functional-spec.md NOTI-001~004 와 매핑.
 */
export const NotificationType = {
  /** NOTI-001 — 판매자에게 문의 도착 */
  INQUIRY_RECEIVED: 'INQUIRY_RECEIVED',
  /** NOTI-002 — 구매자에게 견적 발송됨 */
  QUOTE_RECEIVED: 'QUOTE_RECEIVED',
  /** NOTI-003 — 양측에 거래 상태 변경 */
  DEAL_STATUS_CHANGED: 'DEAL_STATUS_CHANGED',
  /** NOTI-004 — 판매자에게 미팅 요청 도착 */
  MEETING_REQUESTED: 'MEETING_REQUESTED',
  /** NOTI-004 — 구매자에게 미팅 응답(수락/거절/재제안/확정/취소/완료) */
  MEETING_RESPONDED: 'MEETING_RESPONDED',
  /** 운영 — 관리자 사업자 인증 결과(승인/반려) */
  BUSINESS_INFO_VERIFIED: 'BUSINESS_INFO_VERIFIED',
  /** 운영 — 관리자 회원 상태 변경(정지/해제) */
  MEMBER_STATUS_CHANGED: 'MEMBER_STATUS_CHANGED',
} as const;

export type NotificationTypeCode =
  (typeof NotificationType)[keyof typeof NotificationType];
