import { RefreshCcw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ModeTitle } from "../../notebooks/components/ModeTitle";
import { RegenerateMindmapModal } from "./RegenerateMindmapModal";
import { ICON_MOTION_TRIGGER, iconMotion } from "../../../shared/ui/iconMotion";

type Props = {
  children: ReactNode;
  showRefreshAction?: boolean;
  canRefresh?: boolean;
  isRefreshing?: boolean;
  onRefresh?: (prompt?: string) => void;
};

export function MindmapShell({
  children,
  showRefreshAction = false,
  canRefresh = false,
  isRefreshing = false,
  onRefresh,
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

  const handleRefreshConfirm = (prompt?: string) => {
    if (!onRefresh || !canRefresh || isRefreshing) return;
    setIsRegenerateModalOpen(false);
    onRefresh(prompt);
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-[45px] items-center justify-between border-b border-border px-4">
        <ModeTitle>Mapa mental</ModeTitle>
        <div className="flex items-center gap-2">
          {showRefreshAction ? (
            <button
              type="button"
              className={`${ICON_MOTION_TRIGGER} rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={handleRefreshRequest}
              disabled={!canRefresh || isRefreshing}
              aria-label="Actualizar mapa mental"
              title="Actualizar mapa mental"
            >
              <RefreshCcw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : iconMotion.spinOnHover}`} />
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
