import { ArrowLeft, RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";

import { ModeTitle } from "../../notebooks/components/ModeTitle";
import { ICON_MOTION_TRIGGER, iconMotion } from "../../../shared/ui/iconMotion";

type Props = {
  children: ReactNode;
  title?: string;
  levelTitle?: string;
  showRegenerateAction?: boolean;
  canRegenerate?: boolean;
  isRegenerating?: boolean;
  onRegenerate?: () => void;
  showBackToRoadmapAction?: boolean;
  onBackToRoadmap?: () => void;
};

export function QuizShell({
  children,
  title = "Quiz",
  levelTitle,
  showRegenerateAction = false,
  canRegenerate = false,
  isRegenerating = false,
  onRegenerate,
  showBackToRoadmapAction = false,
  onBackToRoadmap,
}: Props) {
  const handleRegenerate = () => {
    if (!onRegenerate || !canRegenerate || isRegenerating) return;
    onRegenerate();
  };

  const handleBackToRoadmap = () => {
    if (!onBackToRoadmap) return;
    onBackToRoadmap();
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-[45px] items-center justify-between border-b border-border px-4">
        <div className="flex min-w-0 items-center gap-3">
          <ModeTitle>{title}</ModeTitle>
          {levelTitle ? (
            <>
              <div className="h-4 w-px bg-muted-hover" />
              <h3 className="truncate text-sm font-semibold text-foreground">
                {levelTitle}
              </h3>
            </>
          ) : null}
        </div>
        {showBackToRoadmapAction ? (
          <button
            type="button"
            className={`${ICON_MOTION_TRIGGER} rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
            onClick={handleBackToRoadmap}
            aria-label="Volver al roadmap"
            title="Volver al roadmap"
          >
            <ArrowLeft className={`h-4 w-4 ${iconMotion.nudgeLeftOnHover}`} />
          </button>
        ) : showRegenerateAction ? (
          <button
            type="button"
            className={`${ICON_MOTION_TRIGGER} rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50`}
            onClick={handleRegenerate}
            disabled={!canRegenerate || isRegenerating}
            aria-label="Regenerar quiz"
            title="Regenerar quiz"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isRegenerating ? "animate-spin" : iconMotion.spinOnHover}`}
            />
          </button>
        ) : null}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
