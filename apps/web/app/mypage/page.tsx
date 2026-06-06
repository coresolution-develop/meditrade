"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMember, logout } from "@/lib/auth-client";
import { Button } from "@/components/Button";
import { ROLE_LABEL } from "@/lib/format";

interface MenuItem {
  label: string;
  href?: string;
  phase?: "P1" | "P2";
}

const BUYER_MENU: MenuItem[] = [
  { label: "찜 목록", phase: "P2" },
  { label: "내 문의·견적", phase: "P2" },
  { label: "내 미팅 요청", phase: "P2" },
  { label: "거래 내역", phase: "P2" },
];

const SELLER_MENU: MenuItem[] = [
  { label: "내 상품", href: "/seller/products", phase: "P1" },
  { label: "받은 문의", phase: "P2" },
  { label: "받은 미팅 요청", phase: "P2" },
  { label: "거래 관리", phase: "P2" },
  { label: "사업자 인증", phase: "P2" },
];

export default function MyPage() {
  const router = useRouter();
  const { member, loading } = useMember();

  const handleLogout = async () => {
    await logout(); // 내부에서 mt:auth-changed 이벤트 발행 → useMember 자동 갱신
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-7 w-1/3 rounded bg-slate-100" />
        <div className="h-40 rounded-xl bg-slate-100" />
      </div>
    );
  }

  if (!member) {
    // 미들웨어가 막아주지만, 방어적으로
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-slate-600">로그인이 필요합니다.</p>
        <Link href="/login">
          <Button>로그인</Button>
        </Link>
      </div>
    );
  }

  const menu = member.role === "SELLER" ? SELLER_MENU : BUYER_MENU;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">마이페이지</h1>
        <p className="text-sm text-slate-500">{ROLE_LABEL[member.role]} 계정</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          <dt className="text-slate-500">이름</dt>
          <dd className="col-span-2 font-medium text-slate-900">
            {member.name}
          </dd>
          <dt className="text-slate-500">이메일</dt>
          <dd className="col-span-2 text-slate-800">{member.email}</dd>
          <dt className="text-slate-500">역할</dt>
          <dd className="col-span-2 text-slate-800">
            {ROLE_LABEL[member.role]}
          </dd>
        </dl>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-slate-700">메뉴</h2>
        <ul className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          {menu.map((item) => (
            <li
              key={item.label}
              className="flex items-center justify-between border-t border-slate-100 first:border-t-0"
            >
              {item.href ? (
                <Link
                  href={item.href}
                  className="flex w-full items-center justify-between px-4 py-3 text-sm hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">
                    {item.label}
                  </span>
                  <span className="text-xs text-slate-400">›</span>
                </Link>
              ) : (
                <div className="flex w-full items-center justify-between px-4 py-3 text-sm text-slate-400">
                  <span>{item.label}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium">
                    {item.phase}
                  </span>
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div>
        <Button variant="secondary" onClick={handleLogout}>
          로그아웃
        </Button>
      </div>
    </div>
  );
}
