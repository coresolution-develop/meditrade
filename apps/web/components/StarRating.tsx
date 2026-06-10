"use client";

interface Props {
  value: number;
  /** 지정 시 인터랙티브(입력), 미지정 시 읽기 전용 표시. */
  onChange?: (value: number) => void;
}

/** 1~5 별점. onChange 가 있으면 입력, 없으면 표시 전용. */
export function StarRating({ value, onChange }: Props) {
  const stars = [1, 2, 3, 4, 5];
  const rounded = Math.round(value);

  if (!onChange) {
    return (
      <div className="inline-flex items-center gap-0.5" aria-label={`별점 ${value}`}>
        {stars.map((s) => (
          <span
            key={s}
            aria-hidden
            className={s <= rounded ? "text-amber-500" : "text-slate-300"}
          >
            ★
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="별점 선택">
      {stars.map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          aria-label={`${s}점`}
          aria-pressed={s === value}
          className={`text-2xl leading-none transition ${
            s <= value ? "text-amber-500" : "text-slate-300 hover:text-amber-300"
          }`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
