import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  children: ReactNode;
}

const base =
  "inline-flex h-11 min-w-[44px] items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60";

const styles: Record<Variant, string> = {
  primary:
    "bg-slate-900 text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-300",
  secondary:
    "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-200",
  danger:
    "bg-rose-600 text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-200",
  ghost:
    "text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200",
};

export function Button({
  variant = "primary",
  loading,
  disabled,
  children,
  className,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`${base} ${styles[variant]} ${className ?? ""}`}
    >
      {loading && (
        <span
          className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}
