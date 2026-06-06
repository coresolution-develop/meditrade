import { ReactNode } from "react";

interface Props {
  label: string;
  htmlFor: string;
  error?: string;
  required?: boolean;
  hint?: string;
  children: ReactNode;
}

export function FormField({
  label,
  htmlFor,
  error,
  required,
  hint,
  children,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-slate-800"
      >
        {label}
        {required && <span className="ml-0.5 text-rose-600">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-rose-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "h-11 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-2 focus:ring-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100";
