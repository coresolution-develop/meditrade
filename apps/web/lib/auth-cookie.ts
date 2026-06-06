// 서버 사이드(라우트 핸들러 / 미들웨어 / 서버 컴포넌트) 전용 쿠키 헬퍼.
import type { Member } from "@/types/api";

export const TOKEN_COOKIE = "mt_token";
export const MEMBER_COOKIE = "mt_member";

export const ACCESS_TOKEN_MAX_AGE = 60 * 60; // 1h — 백엔드 JWT 와 동일

/**
 * httpOnly accessToken 쿠키 설정 옵션.
 * - httpOnly: JS 에서 읽을 수 없음(localStorage 대안 핵심)
 * - sameSite: lax — same-origin 프록시 호출에서 자동 전송
 * - secure: 운영(HTTPS)에서만 true 권장. 로컬은 false.
 */
export const tokenCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ACCESS_TOKEN_MAX_AGE,
};

/**
 * 멤버 정보(id/email/name/role) 쿠키 — httpOnly 아님.
 * 클라이언트가 역할별 메뉴/가드를 그릴 때 읽음. 토큰 자체는 안 들어감.
 */
export const memberCookieOptions = {
  httpOnly: false,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: ACCESS_TOKEN_MAX_AGE,
};

/**
 * 멤버 쿠키 인코딩 규칙
 * - 서버: 순수 JSON 문자열만 반환. URL 인코딩은 NextResponse.cookies.set 이 1회 수행.
 *   (수동으로 encodeURIComponent 하면 Next 의 자동 인코딩과 겹쳐 이중 인코딩 발생)
 * - 미들웨어: req.cookies.get().value 가 Next 에 의해 1회 디코드된 순수 JSON 이므로 JSON.parse 만.
 * - 클라이언트(useMember): document.cookie 는 Set-Cookie 원문(1회 인코딩) 이므로
 *   decodeURIComponent → JSON.parse 순으로 1회 디코드.
 */
export function encodeMember(m: Member): string {
  return JSON.stringify(m);
}

export function decodeMember(raw: string | undefined | null): Member | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Member;
  } catch {
    return null;
  }
}
