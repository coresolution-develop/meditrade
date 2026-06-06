import { ReactNode } from "react";

interface Props {
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description && (
        <p className="text-xs text-slate-500">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
