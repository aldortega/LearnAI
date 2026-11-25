import { Layers, RefreshCcw, Settings } from "lucide-react";
import type { ReactNode } from "react";

import { ModeTitle } from "../../notebooks/components/ModeTitle";
import { ICON_MOTION_TRIGGER, iconMotion } from "../../../shared/ui/iconMotion";

type Props = {
  children: ReactNode;
  showSetsAction?: boolean;
  canSetsAction?: boolean;
  onSetsAction?: () => void;
  showAction?: boolean;
  actionType?: "settings" | "regenerate";
  canAction?: boolean;
  isActionLoading?: boolean;
  onAction?: () => void;
};

export function FlashcardsShell({
  children,
  showSetsAction = false,
  canSetsAction = false,
  onSetsAction,
  showAction = false,
  actionType = "settings",
  canAction = false,
  isActionLoading = false,
  onAction,
}: Props) {
  const actionLabel =
    actionType === "regenerate"
      ? "Regenerar flashcards"
      : "Abrir configuracion de flashcards";

  const ActionIcon = actionType === "regenerate" ? RefreshCcw : Settings;

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-[45px] items-center justify-between border-b border-border px-4">
        <ModeTitle>Flashcards</ModeTitle>
        <div className="flex items-center gap-1">
          {showSetsAction ? (
            <button
              type="button"
              className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              onClick={onSetsAction}
              disabled={!canSetsAction}
              aria-label="Ver sets"
              title="Ver sets"
            >
              <Layers className="h-4 w-4" />
            </button>
          ) : null}
          {showAction ? (
            <button
              type="button"
              className={`${ICON_MOTION_TRIGGER} rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50`}
              onClick={onAction}
              disabled={!canAction || isActionLoading}
              aria-label={actionLabel}
              title={actionLabel}
            >
              <ActionIcon
                className={`h-4 w-4 ${isActionLoading ? "animate-spin" : actionType === "regenerate" ? iconMotion.spinOnHover : ""}`}
              />
            </button>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
