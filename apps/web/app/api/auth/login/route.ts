// 로그인 전용 라우트.
// 백엔드 /auth/login 호출 후 accessToken 을 httpOnly 쿠키에,
// member 정보를 일반 쿠키에 심는다. 응답 본문에 토큰은 노출하지 않는다.
import { NextRequest, NextResponse } from "next/server";
import {
  TOKEN_COOKIE,
  MEMBER_COOKIE,
  tokenCookieOptions,
  memberCookieOptions,
  encodeMember,
} from "@/lib/auth-cookie";
import type { ApiResponse, LoginResponse } from "@/types/api";

const BACKEND =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3001/api/v1";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const upstream = await fetch(`${BACKEND}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    cache: "no-store",
  });

  const payload = (await upstream.json()) as ApiResponse<LoginResponse>;

  if (!payload.success || !payload.data) {
    return NextResponse.json(payload, { status: upstream.status });
  }

  const { accessToken, member } = payload.data;

  // 응답에는 accessToken 을 빼고 member 만 노출
  const res = NextResponse.json({
    success: true,
    code: "OK",
    message: "OK",
    data: { member },
  } satisfies ApiResponse<{ member: typeof member }>);

  res.cookies.set(TOKEN_COOKIE, accessToken, tokenCookieOptions);
  res.cookies.set(MEMBER_COOKIE, encodeMember(member), memberCookieOptions);
  return res;
}
