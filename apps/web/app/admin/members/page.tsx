"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FilterTabs } from "@/components/FilterTabs";
import { Pagination } from "@/components/Pagination";
import {
  MEMBER_STATUS_LABEL,
  MEMBER_STATUS_TONE,
  ROLE_LABEL,
  formatDate,
} from "@/lib/format";
import type {
  AdminMemberItem,
  AdminMemberList,
  MemberStatus,
  Role,
} from "@/types/api";

const ROLE_FILTERS: { label: string; value: Role | "" }[] = [
  { label: "전체", value: "" },
  { label: "구매자", value: "BUYER" },
  { label: "판매자", value: "SELLER" },
  { label: "관리자", value: "ADMIN" },
];

const STATUS_FILTERS: { label: string; value: MemberStatus | "" }[] = [
  { label: "전체", value: "" },
  { label: "활성", value: "ACTIVE" },
  { label: "정지", value: "SUSPENDED" },
  { label: "대기", value: "PENDING" },
];

const SIZE = 20;

export default function AdminMembersPage() {
  const [role, setRole] = useState<Role | "">("");
  const [status, setStatus] = useState<MemberStatus | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminMemberList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [suspendTarget, setSuspendTarget] = useState<AdminMemberItem | null>(
    null,
  );

  const load = useCallback(async () => {
    setData(null);
    setError(null);
    try {
      const res = await api.get<AdminMemberList>("/admin/members", {
        role: role || undefined,
        status: status || undefined,
        page,
        size: SIZE,
      });
      setData(res);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다.",
      );
    }
  }, [role, status, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(t);
  }, [flash]);

  const setMemberStatus = async (
    item: AdminMemberItem,
    next: "ACTIVE" | "SUSPENDED",
  ) => {
    setBusyId(item.id);
    try {
      await api.patch(`/admin/members/${item.id}/status`, { status: next });
      setFlash(
        `${item.name} 계정을 ${next === "SUSPENDED" ? "정지" : "정지 해제"}했습니다.`,
      );
      setSuspendTarget(null);
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
      <div className="flex flex-col gap-2">
        <FilterTabs
          options={ROLE_FILTERS}
          value={role}
          onChange={(v) => {
            setRole(v);
            setPage(1);
          }}
        />
        <FilterTabs
          options={STATUS_FILTERS}
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        />
      </div>

      {flash && (
        <div
          className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
          role="status"
        >
          {flash}
        </div>
      )}

      {data === null ? (
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
      ) : data.items.length === 0 ? (
        <EmptyState title="해당 조건의 회원이 없습니다." />
      ) : (
        <>
          <p className="text-xs text-slate-500">
            총 {data.total.toLocaleString("ko-KR")}명
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">회원</th>
                  <th className="px-4 py-3 font-medium">역할</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 font-medium">가입일</th>
                  <th className="px-4 py-3 text-right font-medium">처리</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((m) => (
                  <tr key={m.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-500">
                        {m.email}
                        {m.phone ? ` · ${m.phone}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {ROLE_LABEL[m.role]}
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={MEMBER_STATUS_TONE[m.status]}>
                        {MEMBER_STATUS_LABEL[m.status]}
                      </Pill>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        {m.role === "ADMIN" ? (
                          <span className="text-xs text-slate-400">
                            관리자 계정
                          </span>
                        ) : m.status === "SUSPENDED" ? (
                          <Button
                            variant="secondary"
                            onClick={() => void setMemberStatus(m, "ACTIVE")}
                            loading={busyId === m.id}
                          >
                            정지 해제
                          </Button>
                        ) : (
                          <Button
                            variant="danger"
                            onClick={() => setSuspendTarget(m)}
                            disabled={busyId === m.id}
                          >
                            정지
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={page}
            total={data.total}
            size={SIZE}
            onChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={Boolean(suspendTarget)}
        title="회원을 정지할까요?"
        description={
          suspendTarget
            ? `${suspendTarget.name}(${suspendTarget.email}) 계정을 정지합니다. 해당 회원에게 알림이 전송됩니다.`
            : undefined
        }
        confirmLabel="정지"
        loading={busyId !== null && suspendTarget !== null}
        onConfirm={() =>
          suspendTarget && void setMemberStatus(suspendTarget, "SUSPENDED")
        }
        onCancel={() => busyId === null && setSuspendTarget(null)}
      />
    </div>
  );
}
