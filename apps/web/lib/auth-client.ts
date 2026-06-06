"use client";

import { useEffect, useState, useCallback } from "react";
import type { Member } from "@/types/api";
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
