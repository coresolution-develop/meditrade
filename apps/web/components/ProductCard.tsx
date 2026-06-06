import Link from "next/link";
import type { ProductListItem } from "@/types/api";
import { formatPrice } from "@/lib/format";
import {
  ConditionBadge,
  NegotiableBadge,
  StatusBadge,
} from "@/components/Badge";

interface Props {
  product: ProductListItem;
  href?: string;
  /** 카드 우측 상단에 표시할 액션(예: 수정/삭제 버튼) */
  actions?: React.ReactNode;
}

export function ProductCard({ product, href, actions }: Props) {
  const link = href ?? `/products/${product.id}`;

  const inner = (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm">
      <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-slate-100 text-xs text-slate-400">
        이미지 자리
      </div>
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-slate-900">
            {product.name}
          </h3>
          {actions && <div className="shrink-0">{actions}</div>}
        </div>
        {product.modelName && (
          <p className="text-xs text-slate-500">{product.modelName}</p>
        )}
        <div className="mt-auto flex flex-wrap items-center gap-1.5">
          <ConditionBadge value={product.conditionType} />
          <StatusBadge value={product.status} />
          {product.priceNegotiable && <NegotiableBadge />}
        </div>
        <div className="flex items-end justify-between gap-2">
          <p className="text-base font-semibold text-slate-900">
            {formatPrice(product.price)}
          </p>
          {product.region && (
            <p className="text-xs text-slate-500">{product.region}</p>
          )}
        </div>
      </div>
    </div>
  );

  return href === null ? inner : <Link href={link}>{inner}</Link>;
}

export function ProductCardSkeleton() {
  return (
    <div className="flex h-full animate-pulse flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4">
      <div className="aspect-[4/3] rounded-md bg-slate-100" />
      <div className="h-4 w-3/4 rounded bg-slate-100" />
      <div className="h-3 w-1/2 rounded bg-slate-100" />
      <div className="h-6 w-1/3 rounded bg-slate-100" />
    </div>
  );
}
