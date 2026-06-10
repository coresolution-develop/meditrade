"use client";

import { Button } from "@/components/Button";

interface Props {
  page: number;
  total: number;
  size: number;
  onChange: (page: number) => void;
}

/** 페이지 이동 컨트롤. total/size 로 마지막 페이지를 계산한다. */
export function Pagination({ page, total, size, onChange }: Props) {
  const lastPage = Math.max(1, Math.ceil(total / size));
  if (lastPage <= 1) return null;

  return (
    <div className="mt-2 flex items-center justify-center gap-2">
      <Button
        variant="secondary"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        이전
      </Button>
      <span className="px-2 text-sm text-slate-600">
        {page} / {lastPage}
      </span>
      <Button
        variant="secondary"
        onClick={() => onChange(page + 1)}
        disabled={page >= lastPage}
      >
        다음
      </Button>
    </div>
  );
}
