// 브라우저(클라이언트) 전용 API 클라이언트.
// Next.js 프록시 라우트(/api/proxy/*)를 거쳐 백엔드를 호출한다.
// 프록시가 httpOnly 쿠키에서 accessToken 을 읽어 Authorization 헤더로 부착하므로,
// 클라이언트는 토큰을 직접 다루지 않는다.
import type { ApiResponse } from "@/types/api";

const PROXY_BASE = "/api/proxy";

export class ApiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  body?: unknown;
  query?: Record<string, string | number | undefined>;
  /** 401 시 자동 /login 리다이렉트 여부. 기본 true. */
  redirectOnUnauthorized?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = new URL(
    `${PROXY_BASE}${path.startsWith("/") ? path : `/${path}`}`,
    typeof window !== "undefined" ? window.location.origin : "http://localhost",
  );
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === "") continue;
      url.searchParams.set(k, String(v));
    }
  }
  // 경로만 반환(절대 URL 회피 — 동일 출처 호출)
  return url.pathname + url.search;
}

export async function apiRequest<T>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const { method = "GET", body, query, redirectOnUnauthorized = true } = opts;

  const res = await fetch(buildUrl(path, query), {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await res.json()) as ApiResponse<T>;
  } catch {
    throw new ApiError(
      "INTERNAL_ERROR",
      "서버 응답을 해석할 수 없습니다.",
      res.status,
    );
  }

  if (!payload.success) {
    if (
      payload.code === "UNAUTHORIZED" &&
      redirectOnUnauthorized &&
      typeof window !== "undefined"
    ) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      window.location.href = `/login?next=${next}`;
    }
    throw new ApiError(payload.code, payload.message, res.status);
  }

  return payload.data as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) =>
    apiRequest<T>(path, { method: "GET", query }),
  post: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "POST", body }),
  put: <T>(path: string, body?: unknown) =>
    apiRequest<T>(path, { method: "PUT", body }),
  delete: <T>(path: string) => apiRequest<T>(path, { method: "DELETE" }),
};
