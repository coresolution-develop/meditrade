"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api";
import { useMember } from "@/lib/auth-client";
import type { FavoriteList } from "@/types/api";

interface Props {
  productId: string;
  /**
   * 초기 찜 상태. 목록에서 일괄 주입할 때 사용한다.
   * 미지정 시 BUYER 에 한해 `GET /favorites` 로 1회 조회한다.
   */
  initialFavorited?: boolean;
  onChange?: (favorited: boolean) => void;
  className?: string;
}

/**
 * 상품 찜 토글. 구매자만 노출되며, 비로그인 클릭 시 로그인으로 유도한다.
 * 낙관적 갱신 + 409(이미 찜)/404(찜 없음)는 의도한 상태로 흡수한다.
 */
export function FavoriteButton({
  productId,
  initialFavorited,
  onChange,
  className,
}: Props) {
  const { member } = useMember();
  const router = useRouter();
  const [favorited, setFavorited] = useState(Boolean(initialFavorited));
  const [ready, setReady] = useState(initialFavorited !== undefined);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (initialFavorited !== undefined) {
      setFavorited(initialFavorited);
      setReady(true);
      return;
    }
    if (member?.role !== "BUYER") {
      setReady(true);
      return;
    }
    let alive = true;
    api
      .get<FavoriteList>("/favorites")
      .then((res) => {
        if (alive)
          setFavorited(res.items.some((f) => f.productId === productId));
      })
      .catch(() => {
        /* 조회 실패 시 미찜 상태로 둔다 */
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [member, productId, initialFavorited]);

  // 판매자/관리자에게는 노출하지 않는다.
  if (member && member.role !== "BUYER") return null;

  const toggle = async () => {
    if (!member) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search,
      );
      router.push(`/login?next=${next}`);
      return;
    }
    const nextState = !favorited;
    setBusy(true);
    setFavorited(nextState); // 낙관적
    try {
      if (nextState) await api.post("/favorites", { productId: Number(productId) });
      else await api.delete(`/favorites/${productId}`);
      onChange?.(nextState);
    } catch (err) {
      if (err instanceof ApiError && (err.status === 409 || err.status === 404)) {
        onChange?.(nextState); // 이미 의도한 상태
      } else {
        setFavorited(!nextState); // 롤백
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy || !ready}
      aria-pressed={favorited}
      aria-label={favorited ? "찜 해제" : "찜하기"}
      className={`inline-flex h-11 min-w-[44px] items-center justify-center gap-1.5 rounded-md border px-3 text-sm font-medium transition disabled:opacity-60 ${
        favorited
          ? "border-rose-200 bg-rose-50 text-rose-600"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      } ${className ?? ""}`}
    >
      <span aria-hidden>{favorited ? "♥" : "♡"}</span>
      찜
    </button>
  );
}
