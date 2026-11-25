import { ArrowLeft, RefreshCcw } from "lucide-react";
import { useState, type ReactNode } from "react";

import { ModeTitle } from "../../notebooks/components/ModeTitle";
import { RegenerateQuickstartModal } from "./RegenerateQuickstartModal";
import { ICON_MOTION_TRIGGER, iconMotion } from "../../../shared/ui/iconMotion";

type Props = {
  children: ReactNode;
  showRefreshAction?: boolean;
  canRefresh?: boolean;
  isRefreshing?: boolean;
  topicCount?: number;
  onRefresh?: () => void;
  onBack?: () => void;
};

export function QuickstartShell({
  children,
  showRefreshAction = false,
  canRefresh = false,
  isRefreshing = false,
  topicCount = 0,
  onRefresh,
  onBack,
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
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex h-[45px] items-center justify-between border-b border-border px-4">
        <ModeTitle>Inicio rápido</ModeTitle>
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Volver al inicio rápido"
            title="Volver al inicio rápido"
            className={`${ICON_MOTION_TRIGGER} rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
          >
            <ArrowLeft className={`h-4 w-4 ${iconMotion.nudgeLeftOnHover}`} />
          </button>
        ) : showRefreshAction ? (
          <button
            type="button"
            className={`${ICON_MOTION_TRIGGER} rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50`}
            onClick={handleRefreshRequest}
            disabled={!canRefresh || isRefreshing}
            aria-label="Regenerar inicio rápido"
            title="Regenerar inicio rápido"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isRefreshing ? "animate-spin" : iconMotion.spinOnHover}`}
            />
          </button>
        ) : null}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
      <RegenerateQuickstartModal
        isOpen={isRegenerateModalOpen}
        isRegenerating={isRefreshing}
        topicCount={topicCount}
        onCancel={handleRefreshCancel}
        onConfirm={handleRefreshConfirm}
      />
    </div>
  );
}
