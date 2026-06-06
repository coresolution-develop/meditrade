import { NextRequest, NextResponse } from "next/server";
import { TOKEN_COOKIE, MEMBER_COOKIE, decodeMember } from "@/lib/auth-cookie";

const PROTECTED_PREFIXES = ["/seller", "/mypage"];
const SELLER_ONLY_PREFIXES = ["/seller"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (!PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  if (!token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname + req.nextUrl.search);
    return NextResponse.redirect(url);
  }

  if (SELLER_ONLY_PREFIXES.some((p) => pathname.startsWith(p))) {
    const member = decodeMember(req.cookies.get(MEMBER_COOKIE)?.value);
    if (!member || member.role !== "SELLER") {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/seller/:path*", "/mypage/:path*"],
};
