"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField, inputClass } from "@/components/FormField";
import type {
  CreateManufacturerBody,
  Manufacturer,
  ManufacturerList,
  UpdateManufacturerBody,
} from "@/types/api";

export default function AdminManufacturersPage() {
  const [items, setItems] = useState<Manufacturer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [editing, setEditing] = useState<Manufacturer | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Manufacturer | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<ManufacturerList>("/admin/manufacturers");
      setItems(res.items);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "목록을 불러오지 못했습니다.",
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 3500);
    return () => clearTimeout(t);
  }, [flash]);

  const onSaved = (msg: string) => {
    setFlash(msg);
    setEditing(null);
    void load();
  };

  const onDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/manufacturers/${deleteTarget.id}`);
      setFlash(`"${deleteTarget.name}" 제조사를 삭제했습니다.`);
      setDeleteTarget(null);
      void load();
    } catch (err) {
      setFlash(
        err instanceof ApiError ? err.message : "삭제 중 오류가 발생했습니다.",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <ManufacturerForm
        key={editing?.id ?? "new"}
        editing={editing}
        onSaved={onSaved}
        onCancel={() => setEditing(null)}
      />

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
        <EmptyState title="등록된 제조사가 없습니다." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">국가</th>
                <th className="px-4 py-3 font-medium">정렬</th>
                <th className="px-4 py-3 text-right font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {m.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {m.country ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{m.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setEditing(m)}>
                        수정
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setDeleteTarget(m)}
                      >
                        삭제
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
        open={Boolean(deleteTarget)}
        title="제조사를 삭제할까요?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" 을(를) 삭제합니다.`
            : undefined
        }
        confirmLabel="삭제"
        loading={deleting}
        onConfirm={onDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
}

function ManufacturerForm({
  editing,
  onSaved,
  onCancel,
}: {
  editing: Manufacturer | null;
  onSaved: (msg: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [country, setCountry] = useState(editing?.country ?? "");
  const [sortOrder, setSortOrder] = useState(
    editing ? String(editing.sortOrder) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("이름을 입력해 주세요.");

    const body: CreateManufacturerBody | UpdateManufacturerBody = {
      name: name.trim(),
      ...(country.trim() ? { country: country.trim() } : {}),
      ...(sortOrder !== "" ? { sortOrder: Number(sortOrder) } : {}),
    };

    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/admin/manufacturers/${editing.id}`, body);
        onSaved(`"${name.trim()}" 제조사를 수정했습니다.`);
      } else {
        await api.post("/admin/manufacturers", body);
        onSaved(`"${name.trim()}" 제조사를 추가했습니다.`);
      }
    } catch (e2) {
      setErr(
        e2 instanceof ApiError ? e2.message : "저장 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h2 className="text-sm font-medium text-slate-700">
        {editing ? `제조사 수정 — ${editing.name}` : "제조사 추가"}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField label="이름" htmlFor="mfr-name" required>
          <input
            id="mfr-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            disabled={submitting}
            required
          />
        </FormField>
        <FormField label="국가" htmlFor="mfr-country">
          <input
            id="mfr-country"
            className={inputClass}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            maxLength={50}
            disabled={submitting}
          />
        </FormField>
        <FormField label="정렬 순서" htmlFor="mfr-sort">
          <input
            id="mfr-sort"
            type="number"
            className={inputClass}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            min={0}
            disabled={submitting}
          />
        </FormField>
      </div>

      {err && (
        <div
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          role="alert"
        >
          {err}
        </div>
      )}

      <div className="flex gap-2">
        <Button type="submit" loading={submitting}>
          {editing ? "수정" : "추가"}
        </Button>
        {editing && (
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={submitting}
          >
            취소
          </Button>
        )}
      </div>
    </form>
  );
}
