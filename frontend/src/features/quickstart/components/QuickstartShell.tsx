import type { ReactNode } from "react";
import { RefreshCcw } from "lucide-react";

type Props = {
  children: ReactNode;
  showRefreshAction?: boolean;
  canRefresh?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
};

export function QuickstartShell({
  children,
  showRefreshAction = false,
  canRefresh = false,
  isRefreshing = false,
  onRefresh,
}: Props) {
  const handleRefresh = () => {
    if (!onRefresh || !canRefresh || isRefreshing) return;
    onRefresh();
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-zinc-950">
      <div className="flex h-[45px] items-center justify-between border-b border-zinc-200 px-4 dark:border-zinc-800">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Inicio rapido
        </h2>
        {showRefreshAction ? (
          <button
            type="button"
            className="rounded-md p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            onClick={handleRefresh}
            disabled={!canRefresh || isRefreshing}
            aria-label="Actualizar inicio rapido"
            title="Actualizar inicio rapido"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
            />
          </button>
        ) : null}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
