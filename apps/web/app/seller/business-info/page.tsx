"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { FormField, inputClass } from "@/components/FormField";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { Pill } from "@/components/Badge";
import { useRequireRole } from "@/lib/auth-client";
import {
  VERIFY_STATUS_LABEL,
  VERIFY_STATUS_TONE,
  formatDate,
} from "@/lib/format";
import type { BusinessInfo, CreateBusinessInfoBody } from "@/types/api";

type LoadState =
  | { kind: "loading" }
  | { kind: "registered"; info: BusinessInfo }
  | { kind: "unregistered" }
  | { kind: "error"; message: string };

export default function BusinessInfoPage() {
  const { ready } = useRequireRole("SELLER");
  const [state, setState] = useState<LoadState>({ kind: "loading" });

  const load = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const info = await api.get<BusinessInfo>("/business-info/me");
      setState({ kind: "registered", info });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setState({ kind: "unregistered" });
      } else {
        setState({
          kind: "error",
          message:
            err instanceof ApiError
              ? err.message
              : "사업자 인증 정보를 불러오지 못했습니다.",
        });
      }
    }
  }, []);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">사업자 인증</h1>
        <p className="text-sm text-slate-500">
          의료기기 판매를 위해 사업자 정보를 등록하고 관리자 승인을 받습니다.
        </p>
      </header>

      {!ready || state.kind === "loading" ? (
        <div className="h-48 animate-pulse rounded-xl bg-slate-100" />
      ) : state.kind === "error" ? (
        <EmptyState
          title="불러오지 못했습니다"
          description={state.message}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              다시 시도
            </Button>
          }
        />
      ) : state.kind === "registered" ? (
        <StatusCard info={state.info} />
      ) : (
        <RegisterForm
          onRegistered={(info) => setState({ kind: "registered", info })}
          onConflict={() => void load()}
        />
      )}
    </div>
  );
}

function StatusCard({ info }: { info: BusinessInfo }) {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-700">인증 상태</h2>
        <Pill tone={VERIFY_STATUS_TONE[info.verifyStatus]}>
          {VERIFY_STATUS_LABEL[info.verifyStatus]}
        </Pill>
      </div>
      <dl className="grid grid-cols-3 gap-y-2 text-sm">
        <dt className="text-slate-500">상호</dt>
        <dd className="col-span-2 font-medium text-slate-900">
          {info.companyName}
        </dd>
        <dt className="text-slate-500">사업자등록번호</dt>
        <dd className="col-span-2 text-slate-800">{info.bizRegNo}</dd>
        <dt className="text-slate-500">판매업 신고번호</dt>
        <dd className="col-span-2 text-slate-800">
          {info.deviceSalesLicenseNo ?? "-"}
        </dd>
        <dt className="text-slate-500">신청일</dt>
        <dd className="col-span-2 text-slate-800">
          {formatDate(info.createdAt)}
        </dd>
      </dl>
      {info.verifyStatus === "PENDING" && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-700">
          관리자 심사 대기 중입니다. 승인 후 모든 판매 기능을 사용할 수 있습니다.
        </p>
      )}
      {info.verifyStatus === "REJECTED" && (
        <p className="rounded-md bg-rose-50 px-3 py-2 text-xs text-rose-700">
          반려되었습니다. 정보를 확인 후 다시 신청해 주세요.
        </p>
      )}
    </section>
  );
}

function RegisterForm({
  onRegistered,
  onConflict,
}: {
  onRegistered: (info: BusinessInfo) => void;
  onConflict: () => void;
}) {
  const [companyName, setCompanyName] = useState("");
  const [bizRegNo, setBizRegNo] = useState("");
  const [licenseNo, setLicenseNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!companyName.trim()) return setError("상호를 입력해 주세요.");
    if (!bizRegNo.trim()) return setError("사업자등록번호를 입력해 주세요.");

    const body: CreateBusinessInfoBody = {
      companyName: companyName.trim(),
      bizRegNo: bizRegNo.trim(),
      ...(licenseNo.trim() ? { deviceSalesLicenseNo: licenseNo.trim() } : {}),
    };

    setSubmitting(true);
    try {
      const info = await api.post<BusinessInfo>("/business-info", body);
      onRegistered(info);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        onConflict(); // 이미 등록됨 → 상태 화면으로 재조회
        return;
      }
      setError(
        err instanceof ApiError
          ? err.message
          : "등록 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <FormField label="상호" htmlFor="companyName" required>
        <input
          id="companyName"
          className={inputClass}
          value={companyName}
          onChange={(e) => setCompanyName(e.target.value)}
          maxLength={100}
          disabled={submitting}
          required
        />
      </FormField>
      <FormField
        label="사업자등록번호"
        htmlFor="bizRegNo"
        required
        hint="예: 123-45-67890"
      >
        <input
          id="bizRegNo"
          className={inputClass}
          value={bizRegNo}
          onChange={(e) => setBizRegNo(e.target.value)}
          maxLength={20}
          disabled={submitting}
          required
        />
      </FormField>
      <FormField
        label="의료기기 판매업 신고번호"
        htmlFor="licenseNo"
        hint="선택 — 예: 제2024-서울-001234호"
      >
        <input
          id="licenseNo"
          className={inputClass}
          value={licenseNo}
          onChange={(e) => setLicenseNo(e.target.value)}
          maxLength={50}
          disabled={submitting}
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

      <Button type="submit" loading={submitting}>
        인증 신청
      </Button>
    </form>
  );
}
