"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormField, inputClass } from "@/components/FormField";
import { Button } from "@/components/Button";
import { ApiError } from "@/lib/api";
import { useMember, notifyAuthChanged } from "@/lib/auth-client";
import type { ApiResponse, Member } from "@/types/api";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") ?? "/products";
  const { refresh } = useMember();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email) return setError("이메일을 입력해 주세요.");
    if (!password) return setError("비밀번호를 입력해 주세요.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "same-origin",
        cache: "no-store",
      });
      const payload = (await res.json()) as ApiResponse<{ member: Member }>;
      if (!payload.success || !payload.data) {
        throw new ApiError(payload.code, payload.message, res.status);
      }
      const role = payload.data.member.role;
      refresh();
      // 다른 페이지에 머무는 Header(루트 레이아웃)도 즉시 갱신
      notifyAuthChanged();
      router.push(role === "SELLER" ? "/seller/products" : next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "로그인 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">로그인</h1>
        <p className="text-sm text-slate-500">
          이메일과 비밀번호로 로그인하세요.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <FormField label="이메일" htmlFor="email" required>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            required
          />
        </FormField>
        <FormField label="비밀번호" htmlFor="password" required>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            required
          />
        </FormField>

        {error && (
          <div
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            role="alert"
          >
            {error}
          </div>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          로그인
        </Button>
      </form>

      <p className="text-center text-sm text-slate-600">
        아직 계정이 없으신가요?{" "}
        <Link
          href="/signup"
          className="font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          회원가입
        </Link>
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-sm text-slate-500">로딩 중...</div>}>
      <LoginForm />
    </Suspense>
  );
}
