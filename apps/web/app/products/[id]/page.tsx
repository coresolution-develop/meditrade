"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";
import {
  ConditionBadge,
  NegotiableBadge,
  StatusBadge,
} from "@/components/Badge";
import { Button } from "@/components/Button";
import { EmptyState } from "@/components/EmptyState";
import { FavoriteButton } from "@/components/FavoriteButton";
import { InquiryButton } from "@/components/InquiryButton";
import { formatPrice } from "@/lib/format";
import type { ProductDetail } from "@/types/api";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { id } = use(params);
  const [data, setData] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ code: string; message: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<ProductDetail>(`/products/${id}`);
      setData(res);
    } catch (err) {
      if (err instanceof ApiError) {
        setError({ code: err.code, message: err.message });
      } else {
        setError({
          code: "INTERNAL_ERROR",
          message: "상품을 불러오지 못했습니다.",
        });
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <ProductDetailSkeleton />;

  if (error?.code === "NOT_FOUND") {
    return (
      <EmptyState
        title="삭제되었거나 존재하지 않는 상품입니다."
        action={
          <Link href="/products">
            <Button variant="secondary">목록으로</Button>
          </Link>
        }
      />
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        title="상품을 불러오지 못했습니다"
        description={error?.message}
        action={
          <Button variant="secondary" onClick={() => void load()}>
            다시 시도
          </Button>
        }
      />
    );
  }

  const mainImage = data.images.find((i) => i.isMain) ?? data.images[0];

  return (
    <article className="grid grid-cols-1 gap-8 md:grid-cols-2">
      <section>
        <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
          {mainImage ? (
            // 외부 이미지 도메인 미설정 → next/image 대신 일반 img 사용
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainImage.imageUrl}
              alt={data.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm text-slate-400">이미지 자리</span>
          )}
        </div>
        {data.images.length > 1 && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {data.images.map((img) => (
              <div
                key={img.id}
                className="aspect-square overflow-hidden rounded-md border border-slate-200 bg-slate-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.imageUrl}
                  alt=""
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap gap-1.5">
            <ConditionBadge value={data.conditionType} />
            <StatusBadge value={data.status} />
            {data.priceNegotiable && <NegotiableBadge />}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            {data.name}
          </h1>
          {data.modelName && (
            <p className="text-sm text-slate-500">모델 {data.modelName}</p>
          )}
        </div>

        <p className="text-3xl font-bold text-slate-900">
          {formatPrice(data.price)}
        </p>

        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          {data.category && (
            <>
              <dt className="text-slate-500">카테고리</dt>
              <dd className="col-span-2 text-slate-800">
                {data.category.name}
              </dd>
            </>
          )}
          {data.region && (
            <>
              <dt className="text-slate-500">지역</dt>
              <dd className="col-span-2 text-slate-800">{data.region}</dd>
            </>
          )}
          <dt className="text-slate-500">재고</dt>
          <dd className="col-span-2 text-slate-800">{data.stock}개</dd>
          <dt className="text-slate-500">조회수</dt>
          <dd className="col-span-2 text-slate-800">
            {data.viewCount.toLocaleString("ko-KR")}
          </dd>
        </dl>

        {data.description && (
          <div className="rounded-md border border-slate-200 bg-white p-4">
            <h2 className="mb-2 text-sm font-medium text-slate-700">
              상세 설명
            </h2>
            <p className="whitespace-pre-wrap text-sm text-slate-700">
              {data.description}
            </p>
          </div>
        )}

        <div className="sticky bottom-4 flex gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <FavoriteButton productId={data.id} />
          <InquiryButton productId={data.id} className="flex-1" />
          <Button
            variant="primary"
            className="flex-1"
            disabled
            title="Phase 2"
          >
            미팅 요청 (P2)
          </Button>
        </div>
      </section>
    </article>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="grid animate-pulse grid-cols-1 gap-8 md:grid-cols-2">
      <div className="aspect-square rounded-xl bg-slate-100" />
      <div className="flex flex-col gap-4">
        <div className="h-4 w-1/3 rounded bg-slate-100" />
        <div className="h-7 w-2/3 rounded bg-slate-100" />
        <div className="h-9 w-1/3 rounded bg-slate-100" />
        <div className="h-32 rounded bg-slate-100" />
      </div>
    </div>
  );
}
