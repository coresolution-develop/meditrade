"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Member, Role } from "@/types/api";
import { MEMBER_COOKIE } from "@/lib/auth-cookie";

const AUTH_EVENT = "mt:auth-changed";

/**
 * 클라이언트에서 비-httpOnly 멤버 쿠키를 읽는다. 토큰은 절대 읽지 않는다.
 * Set-Cookie 가 1회 URL 인코딩된 상태이므로 decodeURIComponent → JSON.parse 1회.
 */
function readMemberCookie(): Member | null {
  if (typeof document === "undefined") return null;
  const pairs = document.cookie.split(";").map((c) => c.trim());
  const found = pairs.find((c) => c.startsWith(`${MEMBER_COOKIE}=`));
  if (!found) return null;
  const raw = found.slice(MEMBER_COOKIE.length + 1);
  try {
    return JSON.parse(decodeURIComponent(raw)) as Member;
  } catch {
    return null;
  }
}

/**
 * 로그인/로그아웃 직후 호출. 같은 SPA 내의 모든 useMember 구독자가 즉시 재읽기 한다.
 * Header 는 root layout 에 머무르므로 router.push 만으로는 useEffect 가 재실행되지 않는다.
 */
export function notifyAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_EVENT));
}

export function useMember(): {
  member: Member | null;
  loading: boolean;
  refresh: () => void;
} {
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setMember(readMemberCookie());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    if (typeof window === "undefined") return;
    const onAuth = () => refresh();
    window.addEventListener(AUTH_EVENT, onAuth);
    // 탭 복귀 시에도 쿠키 만료/외부 변경 반영
    window.addEventListener("focus", onAuth);
    return () => {
      window.removeEventListener(AUTH_EVENT, onAuth);
      window.removeEventListener("focus", onAuth);
    };
  }, [refresh]);

  return { member, loading, refresh };
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
  });
  notifyAuthChanged();
}

/**
 * 역할 전용 페이지 가드. 미들웨어가 1차로 막지만, 클라이언트에서도
 * 미인증/역할 불일치 시 리다이렉트하여 잘못된 화면 노출을 방지한다.
 * 반환 `ready` 가 true 일 때만 본문을 렌더한다.
 */
export function useRequireRole(role: Role): {
  member: Member | null;
  loading: boolean;
  ready: boolean;
} {
  const { member, loading } = useMember();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!member) {
      const next =
        typeof window !== "undefined"
          ? encodeURIComponent(window.location.pathname + window.location.search)
          : "";
      router.replace(`/login?next=${next}`);
    } else if (member.role !== role) {
      router.replace("/");
    }
  }, [loading, member, role, router]);

  return {
    member,
    loading,
    ready: !loading && member?.role === role,
  };
}
