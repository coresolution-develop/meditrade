"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormField, inputClass } from "@/components/FormField";
import { Button } from "@/components/Button";
import { api, ApiError } from "@/lib/api";
import type { Role, SignupResponse } from "@/types/api";

interface FieldErrors {
  email?: string;
  password?: string;
  passwordConfirm?: string;
  name?: string;
  phone?: string;
  agreeTerms?: string;
}

export default function SignupPage() {
  const router = useRouter();

  const [role, setRole] = useState<Role>("BUYER");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [topError, setTopError] = useState<string | null>(null);

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!email) e.email = "이메일을 입력해 주세요.";
    else if (!/^\S+@\S+\.\S+$/.test(email))
      e.email = "이메일 형식이 올바르지 않습니다.";
    if (!password) e.password = "비밀번호를 입력해 주세요.";
    else if (password.length < 8)
      e.password = "비밀번호는 8자 이상이어야 합니다.";
    if (passwordConfirm !== password)
      e.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    if (!name) e.name = "이름을 입력해 주세요.";
    if (phone && !/^[0-9-]+$/.test(phone))
      e.phone = "숫자와 하이픈만 입력 가능합니다.";
    if (!agreeTerms) e.agreeTerms = "약관 동의가 필요합니다.";
    return e;
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTopError(null);
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      await api.post<SignupResponse>("/auth/signup", {
        email,
        password,
        name,
        phone: phone || undefined,
        role,
      });
      router.push("/login");
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        setErrors((prev) => ({ ...prev, email: err.message }));
      } else if (err instanceof ApiError && err.code === "VALIDATION_ERROR") {
        setTopError(err.message);
      } else if (err instanceof ApiError) {
        setTopError(err.message);
      } else {
        setTopError("회원가입 중 오류가 발생했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">회원가입</h1>
        <p className="text-sm text-slate-500">
          역할을 선택하고 가입을 진행하세요.
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <FormField label="역할" htmlFor="role" required>
          <div
            id="role"
            role="radiogroup"
            className="grid grid-cols-2 gap-2"
          >
            {(["BUYER", "SELLER"] as const).map((r) => (
              <button
                type="button"
                key={r}
                role="radio"
                aria-checked={role === r}
                onClick={() => setRole(r)}
                className={`h-11 rounded-md border text-sm font-medium transition ${
                  role === r
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {r === "BUYER" ? "구매자" : "판매자"}
              </button>
            ))}
          </div>
        </FormField>

        <FormField
          label="이메일"
          htmlFor="email"
          required
          error={errors.email}
        >
          <input
            id="email"
            type="email"
            autoComplete="email"
            className={inputClass}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField
          label="비밀번호"
          htmlFor="password"
          required
          hint="8자 이상"
          error={errors.password}
        >
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField
          label="비밀번호 확인"
          htmlFor="passwordConfirm"
          required
          error={errors.passwordConfirm}
        >
          <input
            id="passwordConfirm"
            type="password"
            autoComplete="new-password"
            className={inputClass}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField label="이름" htmlFor="name" required error={errors.name}>
          <input
            id="name"
            type="text"
            autoComplete="name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField label="연락처" htmlFor="phone" error={errors.phone}>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="010-1234-5678"
            className={inputClass}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={agreeTerms}
              onChange={(e) => setAgreeTerms(e.target.checked)}
              disabled={submitting}
            />
            서비스 이용 약관에 동의합니다.
          </label>
          {errors.agreeTerms && (
            <p className="text-xs text-rose-600">{errors.agreeTerms}</p>
          )}
        </div>

        {role === "SELLER" && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            판매자 가입 후 상품 등록은 가능하나, 정식 거래에는 사업자 인증이
            필요합니다(Phase 2).
          </p>
        )}

        {topError && (
          <div
            className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
            role="alert"
          >
            {topError}
          </div>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          가입하기
        </Button>
      </form>

      <p className="text-center text-sm text-slate-600">
        이미 계정이 있으신가요?{" "}
        <Link
          href="/login"
          className="font-medium text-slate-900 underline-offset-4 hover:underline"
        >
          로그인
        </Link>
      </p>
    </>
  );
}
