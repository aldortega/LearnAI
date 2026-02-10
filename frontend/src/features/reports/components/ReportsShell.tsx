import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function ReportsShell({ children }: Props) {
  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-[45px] items-center border-b border-border px-4">
        <h2 className="text-sm font-semibold text-foreground">Informes</h2>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
