import { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-8">
      {children}
    </div>
  );
}
