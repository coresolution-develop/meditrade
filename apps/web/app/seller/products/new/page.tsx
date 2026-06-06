import { ProductForm } from "@/components/ProductForm";

export default function NewSellerProductPage() {
  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">상품 등록</h1>
        <p className="mt-1 text-sm text-slate-500">
          등록 후 즉시 판매중(ON_SALE) 상태로 노출됩니다.
        </p>
      </header>
      <ProductForm mode="create" />
    </div>
  );
}
