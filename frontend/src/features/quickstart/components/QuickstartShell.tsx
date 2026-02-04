import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export function QuickstartShell({ children }: Props) {
  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      <div className="flex h-[45px] items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Inicio rapido
        </h2>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
