// 모든 백엔드 호출은 이 라우트를 경유한다.
// - 클라이언트는 같은 출처(/api/proxy/*)만 호출 → CORS 회피 + 토큰 비노출
// - 서버에서 httpOnly 쿠키의 accessToken 을 Authorization 헤더로 부착
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { TOKEN_COOKIE } from "@/lib/auth-cookie";

const BACKEND =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3001/api/v1";

const HOP_BY_HOP = new Set([
  "host",
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authorization",
  "proxy-authenticate",
  "content-length",
]);

async function forward(req: NextRequest, segments: string[]) {
  const target = `${BACKEND}/${segments.join("/")}${req.nextUrl.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) headers.set(key, value);
  });

  const jar = await cookies();
  const token = jar.get(TOKEN_COOKIE)?.value;
  if (token) headers.set("authorization", `Bearer ${token}`);

  // 안전한 쿠키 노출 방지 — 백엔드로 우리 쿠키를 그대로 보내지 않는다.
  headers.delete("cookie");

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  const upstream = await fetch(target, init);
  const body = await upstream.text();

  const res = new NextResponse(body, {
    status: upstream.status,
    headers: {
      "content-type":
        upstream.headers.get("content-type") ?? "application/json",
    },
  });
  return res;
}

interface RouteContext {
  params: Promise<{ path: string[] }>;
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function POST(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PUT(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  const { path } = await ctx.params;
  return forward(req, path);
}
