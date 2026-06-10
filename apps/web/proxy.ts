import { NextRequest, NextResponse } from "next/server";
import type { Role } from "@/types/api";
import { TOKEN_COOKIE, MEMBER_COOKIE, decodeMember } from "@/lib/auth-cookie";

// 로그인만 필요한(역할 무관) 보호 프리픽스
const AUTH_PREFIXES = ["/mypage", "/notifications"];

// 역할 전용 프리픽스 → 요구 역할
const ROLE_PREFIXES: { prefix: string; role: Role }[] = [
  { prefix: "/seller", role: "SELLER" },
  { prefix: "/buyer", role: "BUYER" },
  { prefix: "/admin", role: "ADMIN" },
];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const roleRule = ROLE_PREFIXES.find((r) => pathname.startsWith(r.prefix));
  const needsAuth =
    roleRule !== undefined ||
    AUTH_PREFIXES.some((p) => pathname.startsWith(p));

  if (!needsAuth) return NextResponse.next();

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (roleRule) {
    const member = decodeMember(req.cookies.get(MEMBER_COOKIE)?.value);
    if (!member || member.role !== roleRule.role) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/seller/:path*",
    "/buyer/:path*",
    "/admin/:path*",
    "/mypage/:path*",
    "/notifications/:path*",
  ],
};
