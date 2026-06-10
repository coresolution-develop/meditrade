"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FilterTabs } from "@/components/FilterTabs";
import {
  VERIFY_STATUS_LABEL,
  VERIFY_STATUS_TONE,
  formatDate,
} from "@/lib/format";
import type {
  AdminBusinessInfoItem,
  AdminBusinessInfoList,
  VerifyStatus,
} from "@/types/api";

const FILTERS: { label: string; value: VerifyStatus | "" }[] = [
  { label: "전체", value: "" },
  { label: "심사 대기", value: "PENDING" },
  { label: "승인", value: "APPROVED" },
  { label: "반려", value: "REJECTED" },
];

export default function AdminBusinessInfoPage() {
  const [filter, setFilter] = useState<VerifyStatus | "">("");
  const [items, setItems] = useState<AdminBusinessInfoItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] =
    useState<AdminBusinessInfoItem | null>(null);

  const load = useCallback(async () => {
    setItems(null);
    setError(null);
    try {
      const res = await api.get<AdminBusinessInfoList>(
        "/admin/business-info",
        filter ? { status: filter } : undefined,
      );
      setItems(res.items);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다.",
      );
    }
  }, [filter]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(t);
  }, [flash]);

  const decide = async (
    item: AdminBusinessInfoItem,
    verifyStatus: "APPROVED" | "REJECTED",
  ) => {
    setBusyId(item.id);
    try {
      await api.patch(`/admin/business-info/${item.id}`, { verifyStatus });
      setFlash(
        `${item.companyName} — ${verifyStatus === "APPROVED" ? "승인" : "반려"} 처리했습니다.`,
      );
      setRejectTarget(null);
      await load();
    } catch (err) {
      setFlash(
        err instanceof ApiError ? err.message : "처리 중 오류가 발생했습니다.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <FilterTabs options={FILTERS} value={filter} onChange={setFilter} />

      {flash && (
        <div
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          role="status"
        >
          {flash}
        </div>
      )}

      {items === null ? (
        <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
      ) : error ? (
        <EmptyState
          title="불러오지 못했습니다"
          description={error}
          action={
            <Button variant="secondary" onClick={() => void load()}>
              다시 시도
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState title="해당 조건의 신청이 없습니다." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">상호 / 신청자</th>
                <th className="px-4 py-3 font-medium">사업자번호</th>
                <th className="px-4 py-3 font-medium">신고번호</th>
                <th className="px-4 py-3 font-medium">상태</th>
                <th className="px-4 py-3 font-medium">신청일</th>
                <th className="px-4 py-3 text-right font-medium">처리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((b) => (
                <tr key={b.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {b.companyName}
                    </p>
                    {b.member && (
                      <p className="text-xs text-slate-500">
                        {b.member.name} · {b.member.email}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{b.bizRegNo}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {b.deviceSalesLicenseNo ?? "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Pill tone={VERIFY_STATUS_TONE[b.verifyStatus]}>
                      {VERIFY_STATUS_LABEL[b.verifyStatus]}
                    </Pill>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDate(b.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="secondary"
                        onClick={() => void decide(b, "APPROVED")}
                        loading={busyId === b.id}
                        disabled={b.verifyStatus === "APPROVED"}
                      >
                        승인
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setRejectTarget(b)}
                        disabled={busyId === b.id || b.verifyStatus === "REJECTED"}
                      >
                        반려
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(rejectTarget)}
        title="사업자 인증을 반려할까요?"
        description={
          rejectTarget
            ? `"${rejectTarget.companyName}" 신청을 반려합니다. 판매자에게 알림이 전송됩니다.`
            : undefined
        }
        confirmLabel="반려"
        loading={busyId !== null && rejectTarget !== null}
        onConfirm={() => rejectTarget && void decide(rejectTarget, "REJECTED")}
        onCancel={() => busyId === null && setRejectTarget(null)}
      />
    </div>
  );
}
