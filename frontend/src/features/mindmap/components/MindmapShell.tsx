import { Eye, EyeOff, RefreshCcw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { RegenerateMindmapModal } from "./RegenerateMindmapModal";

type Props = {
  children: ReactNode;
  showRefreshAction?: boolean;
  canRefresh?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  showDetailToggle?: boolean;
  isDetailVisible?: boolean;
  onToggleDetail?: () => void;
};

export function MindmapShell({
  children,
  showRefreshAction = false,
  canRefresh = false,
  isRefreshing = false,
  onRefresh,
  showDetailToggle = false,
  isDetailVisible = true,
  onToggleDetail,
}: Props) {
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);

  const handleRefreshRequest = () => {
    if (!onRefresh || !canRefresh || isRefreshing) return;
    setIsRegenerateModalOpen(true);
  };

  const handleRefreshCancel = () => {
    if (isRefreshing) return;
    setIsRegenerateModalOpen(false);
  };

  const handleRefreshConfirm = () => {
    if (!onRefresh || !canRefresh || isRefreshing) return;
    setIsRegenerateModalOpen(false);
    onRefresh();
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-[45px] items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-semibold text-foreground">Mapa mental</h2>
        <div className="flex items-center gap-2">
          {showDetailToggle ? (
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              onClick={onToggleDetail}
              aria-label={isDetailVisible ? "Ocultar detalle del nodo" : "Mostrar detalle del nodo"}
              title={isDetailVisible ? "Ocultar detalle del nodo" : "Mostrar detalle del nodo"}
            >
              {isDetailVisible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          ) : null}
          {showRefreshAction ? (
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              onClick={handleRefreshRequest}
              disabled={!canRefresh || isRefreshing}
              aria-label="Actualizar mapa mental"
              title="Actualizar mapa mental"
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex-1 min-h-0">{children}</div>
      <RegenerateMindmapModal
        isOpen={isRegenerateModalOpen}
        isRegenerating={isRefreshing}
        onCancel={handleRefreshCancel}
        onConfirm={handleRefreshConfirm}
      />
    </div>
  );
}
