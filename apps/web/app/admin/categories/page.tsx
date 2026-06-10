"use client";

import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { FormField, inputClass } from "@/components/FormField";
import type {
  AdminCategory,
  AdminCategoryList,
  CreateCategoryBody,
  UpdateCategoryBody,
} from "@/types/api";

export default function AdminCategoriesPage() {
  const [items, setItems] = useState<AdminCategory[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get<AdminCategoryList>("/admin/categories");
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
      await api.delete(`/admin/categories/${deleteTarget.id}`);
      setFlash(`"${deleteTarget.name}" 카테고리를 삭제했습니다.`);
      setDeleteTarget(null);
      void load();
    } catch (err) {
      // 409(사용 중 상품 / 하위 카테고리 존재) 메시지를 그대로 노출.
      setFlash(
        err instanceof ApiError ? err.message : "삭제 중 오류가 발생했습니다.",
      );
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const parentName = (parentId: string | null) =>
    parentId ? (items?.find((c) => c.id === parentId)?.name ?? parentId) : "-";

  return (
    <div className="flex flex-col gap-4">
      <CategoryForm
        key={editing?.id ?? "new"}
        editing={editing}
        categories={items ?? []}
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
        <EmptyState title="등록된 카테고리가 없습니다." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">이름</th>
                <th className="px-4 py-3 font-medium">상위</th>
                <th className="px-4 py-3 font-medium">정렬</th>
                <th className="px-4 py-3 text-right font-medium">관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {c.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {parentName(c.parentId)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Button variant="secondary" onClick={() => setEditing(c)}>
                        수정
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => setDeleteTarget(c)}
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
        title="카테고리를 삭제할까요?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" 을(를) 삭제합니다. 사용 중인 상품이나 하위 카테고리가 있으면 삭제되지 않습니다.`
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

function CategoryForm({
  editing,
  categories,
  onSaved,
  onCancel,
}: {
  editing: AdminCategory | null;
  categories: AdminCategory[];
  onSaved: (msg: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [parentId, setParentId] = useState(editing?.parentId ?? "");
  const [sortOrder, setSortOrder] = useState(
    editing ? String(editing.sortOrder) : "",
  );
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("이름을 입력해 주세요.");

    const body: CreateCategoryBody | UpdateCategoryBody = {
      name: name.trim(),
      ...(parentId ? { parentId: Number(parentId) } : {}),
      ...(sortOrder !== "" ? { sortOrder: Number(sortOrder) } : {}),
    };

    setSubmitting(true);
    try {
      if (editing) {
        await api.put(`/admin/categories/${editing.id}`, body);
        onSaved(`"${name.trim()}" 카테고리를 수정했습니다.`);
      } else {
        await api.post("/admin/categories", body);
        onSaved(`"${name.trim()}" 카테고리를 추가했습니다.`);
      }
    } catch (e2) {
      setErr(
        e2 instanceof ApiError ? e2.message : "저장 중 오류가 발생했습니다.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const parentOptions = categories.filter((c) => c.id !== editing?.id);

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4"
    >
      <h2 className="text-sm font-medium text-slate-700">
        {editing ? `카테고리 수정 — ${editing.name}` : "카테고리 추가"}
      </h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField label="이름" htmlFor="cat-name" required>
          <input
            id="cat-name"
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={50}
            disabled={submitting}
            required
          />
        </FormField>
        <FormField label="상위 카테고리" htmlFor="cat-parent">
          <select
            id="cat-parent"
            className={inputClass}
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            disabled={submitting}
          >
            <option value="">없음 (최상위)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="정렬 순서" htmlFor="cat-sort">
          <input
            id="cat-sort"
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
