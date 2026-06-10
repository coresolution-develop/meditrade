"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Badge";
import { EmptyState } from "@/components/EmptyState";
import { FilterTabs } from "@/components/FilterTabs";
import { Pagination } from "@/components/Pagination";
import { inputClass } from "@/components/FormField";
import { STATUS_LABEL, formatPrice } from "@/lib/format";
import type {
  AdminProductItem,
  AdminProductList,
  ProductStatus,
} from "@/types/api";

const PRODUCT_STATUSES: ProductStatus[] = [
  "DRAFT",
  "PENDING",
  "ON_SALE",
  "SOLD_OUT",
  "HIDDEN",
];

const STATUS_FILTERS: { label: string; value: ProductStatus | "" }[] = [
  { label: "전체", value: "" },
  ...PRODUCT_STATUSES.map((s) => ({ label: STATUS_LABEL[s], value: s })),
];

const STATUS_TONE: Record<ProductStatus, "green" | "amber" | "red" | "slate"> = {
  DRAFT: "slate",
  PENDING: "amber",
  ON_SALE: "green",
  SOLD_OUT: "red",
  HIDDEN: "slate",
};

const SIZE = 20;

export default function AdminProductsPage() {
  const [filter, setFilter] = useState<ProductStatus | "">("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<AdminProductList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(async () => {
    setData(null);
    setError(null);
    try {
      const res = await api.get<AdminProductList>("/admin/products", {
        status: filter || undefined,
        page,
        size: SIZE,
      });
      setData(res);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다.",
      );
    }
  }, [filter, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(t);
  }, [flash]);

  const changeStatus = async (item: AdminProductItem, status: ProductStatus) => {
    setBusyId(item.id);
    try {
      await api.patch(`/admin/products/${item.id}/status`, { status });
      setFlash(`"${item.name}" 상태를 ${STATUS_LABEL[status]}(으)로 변경했습니다.`);
      await load();
    } catch (err) {
      setFlash(
        err instanceof ApiError ? err.message : "변경 중 오류가 발생했습니다.",
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <FilterTabs
        options={STATUS_FILTERS}
        value={filter}
        onChange={(v) => {
          setFilter(v);
          setPage(1);
        }}
      />

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
        <EmptyState title="해당 조건의 상품이 없습니다." />
      ) : (
        <>
          <p className="text-xs text-slate-500">
            총 {data.total.toLocaleString("ko-KR")}건
          </p>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">상품</th>
                  <th className="px-4 py-3 font-medium">가격</th>
                  <th className="px-4 py-3 font-medium">상태</th>
                  <th className="px-4 py-3 text-right font-medium">상태 변경</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/products/${p.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {p.modelName && (
                        <p className="text-xs text-slate-500">{p.modelName}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {formatPrice(p.price)}
                    </td>
                    <td className="px-4 py-3">
                      <Pill tone={STATUS_TONE[p.status]}>
                        {STATUS_LABEL[p.status]}
                      </Pill>
                    </td>
                    <td className="px-4 py-3">
                      <StatusControl
                        key={`${p.id}:${p.status}`}
                        current={p.status}
                        busy={busyId === p.id}
                        onApply={(s) => void changeStatus(p, s)}
                      />
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
    </div>
  );
}

function StatusControl({
  current,
  busy,
  onApply,
}: {
  current: ProductStatus;
  busy: boolean;
  onApply: (status: ProductStatus) => void;
}) {
  const [value, setValue] = useState<ProductStatus>(current);
  return (
    <div className="flex justify-end gap-2">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value as ProductStatus)}
        className={inputClass}
        disabled={busy}
        aria-label="상태 선택"
      >
        {PRODUCT_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </select>
      <Button
        variant="secondary"
        onClick={() => onApply(value)}
        loading={busy}
        disabled={value === current}
      >
        변경
      </Button>
    </div>
  );
}
