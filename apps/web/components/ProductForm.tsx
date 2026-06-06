"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FormField, inputClass } from "@/components/FormField";
import { Button } from "@/components/Button";
import { api, ApiError } from "@/lib/api";
import { SEED_CATEGORIES } from "@/types/api";
import type {
  ConditionType,
  CreateProductBody,
  ProductDetail,
  ProductStatus,
  UpdateProductBody,
} from "@/types/api";

interface FieldErrors {
  name?: string;
  modelName?: string;
  categoryId?: string;
  conditionType?: string;
  price?: string;
  region?: string;
}

interface Props {
  mode: "create" | "edit";
  initial?: ProductDetail;
}

const CONDITIONS: { value: ConditionType; label: string }[] = [
  { value: "NEW", label: "신품" },
  { value: "USED", label: "중고" },
  { value: "REFURBISHED", label: "리퍼" },
];

const STATUSES: { value: ProductStatus; label: string }[] = [
  { value: "ON_SALE", label: "판매중" },
  { value: "SOLD_OUT", label: "품절" },
  { value: "HIDDEN", label: "비공개" },
  { value: "DRAFT", label: "임시저장" },
];

export function ProductForm({ mode, initial }: Props) {
  const router = useRouter();

  const [name, setName] = useState(initial?.name ?? "");
  const [modelName, setModelName] = useState(initial?.modelName ?? "");
  const [categoryId, setCategoryId] = useState<string>(
    initial?.categoryId ?? SEED_CATEGORIES[0]?.id ?? "",
  );
  const [conditionType, setConditionType] = useState<ConditionType>(
    initial?.conditionType ?? "NEW",
  );
  const [price, setPrice] = useState<string>(
    initial?.price !== null && initial?.price !== undefined
      ? String(initial.price)
      : "",
  );
  const [region, setRegion] = useState(initial?.region ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [status, setStatus] = useState<ProductStatus>(
    initial?.status ?? "ON_SALE",
  );

  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [topError, setTopError] = useState<string | null>(null);

  const validate = (): FieldErrors => {
    const e: FieldErrors = {};
    if (!name.trim()) e.name = "상품명을 입력해 주세요.";
    else if (name.trim().length > 200)
      e.name = "상품명은 200자 이내여야 합니다.";
    if (modelName.length > 100)
      e.modelName = "모델명은 100자 이내여야 합니다.";
    if (!categoryId) e.categoryId = "카테고리를 선택해 주세요.";
    if (region.length > 50) e.region = "지역은 50자 이내여야 합니다.";
    if (price.trim()) {
      const n = Number(price);
      if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0)
        e.price = "0 이상의 정수를 입력해 주세요.";
    }
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
      const priceVal = price.trim() === "" ? null : Number(price);

      if (mode === "create") {
        const body: CreateProductBody = {
          name: name.trim(),
          modelName: modelName.trim() || undefined,
          categoryId: Number(categoryId),
          conditionType,
          price: priceVal === null ? undefined : priceVal,
          region: region.trim() || undefined,
          description: description.trim() || undefined,
        };
        await api.post<ProductDetail>("/products", body);
        router.push("/seller/products");
        router.refresh();
      } else if (initial) {
        const body: UpdateProductBody = {
          name: name.trim(),
          modelName: modelName.trim() || undefined,
          price: priceVal,
          region: region.trim() || undefined,
          description: description.trim() || undefined,
          status,
        };
        await api.put<ProductDetail>(`/products/${initial.id}`, body);
        router.push("/seller/products");
        router.refresh();
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setTopError(err.message);
      } else {
        setTopError("저장 중 오류가 발생했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <FormField label="상품명" htmlFor="name" required error={errors.name}>
        <input
          id="name"
          type="text"
          className={inputClass}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={200}
          disabled={submitting}
        />
      </FormField>

      <FormField label="모델명" htmlFor="modelName" error={errors.modelName}>
        <input
          id="modelName"
          type="text"
          className={inputClass}
          value={modelName}
          onChange={(e) => setModelName(e.target.value)}
          maxLength={100}
          disabled={submitting}
        />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="카테고리"
          htmlFor="categoryId"
          required
          error={errors.categoryId}
        >
          <select
            id="categoryId"
            className={inputClass}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={submitting || mode === "edit"}
          >
            {SEED_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="상태유형"
          htmlFor="conditionType"
          required
          error={errors.conditionType}
        >
          <select
            id="conditionType"
            className={inputClass}
            value={conditionType}
            onChange={(e) =>
              setConditionType(e.target.value as ConditionType)
            }
            disabled={submitting || mode === "edit"}
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField
          label="가격(원)"
          htmlFor="price"
          hint="비워두면 '가격 문의'로 표시"
          error={errors.price}
        >
          <input
            id="price"
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            className={inputClass}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            disabled={submitting}
          />
        </FormField>

        <FormField label="지역" htmlFor="region" error={errors.region}>
          <input
            id="region"
            type="text"
            className={inputClass}
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            maxLength={50}
            disabled={submitting}
          />
        </FormField>
      </div>

      {mode === "edit" && (
        <FormField label="판매 상태" htmlFor="status">
          <select
            id="status"
            className={inputClass}
            value={status}
            onChange={(e) => setStatus(e.target.value as ProductStatus)}
            disabled={submitting}
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </FormField>
      )}

      <FormField label="상세 설명" htmlFor="description">
        <textarea
          id="description"
          rows={6}
          className={`${inputClass} h-auto resize-y py-2`}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={submitting}
        />
      </FormField>

      {topError && (
        <div
          className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
          role="alert"
        >
          {topError}
        </div>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={submitting}
        >
          취소
        </Button>
        <Button type="submit" loading={submitting}>
          {mode === "create" ? "등록" : "저장"}
        </Button>
      </div>
    </form>
  );
}
