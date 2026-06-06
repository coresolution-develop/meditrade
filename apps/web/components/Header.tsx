"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMember, logout } from "@/lib/auth-client";

export function Header() {
  const { member } = useMember();
  const router = useRouter();

  const handleLogout = async () => {
    await logout(); // 내부에서 mt:auth-changed 이벤트 발행 → useMember 자동 갱신
    router.push("/");
    router.refresh();
  };

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="text-base font-semibold tracking-tight">
          MediTrade
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          <Link
            href="/products"
            className="rounded px-3 py-2 text-slate-700 hover:bg-slate-100"
          >
            상품
          </Link>
          {member?.role === "SELLER" && (
            <Link
              href="/seller/products"
              className="rounded px-3 py-2 text-slate-700 hover:bg-slate-100"
            >
              내 상품
            </Link>
          )}
          {member ? (
            <>
              <Link
                href="/mypage"
                className="rounded px-3 py-2 text-slate-700 hover:bg-slate-100"
              >
                마이
              </Link>
              <button
                onClick={handleLogout}
                className="ml-1 rounded px-3 py-2 text-slate-600 hover:bg-slate-100"
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded px-3 py-2 text-slate-700 hover:bg-slate-100"
              >
                로그인
              </Link>
              <Link
                href="/signup"
                className="rounded bg-slate-900 px-3 py-2 text-white hover:bg-slate-800"
              >
                회원가입
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
