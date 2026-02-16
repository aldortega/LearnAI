import { RefreshCcw, Settings } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  showAction?: boolean;
  actionType?: "settings" | "regenerate";
  canAction?: boolean;
  isActionLoading?: boolean;
  onAction?: () => void;
};

export function FlashcardsShell({
  children,
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
        <h2 className="text-sm font-semibold text-foreground">Flashcards</h2>
        {showAction ? (
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
            onClick={onAction}
            disabled={!canAction || isActionLoading}
            aria-label={actionLabel}
            title={actionLabel}
          >
            <ActionIcon className={`h-4 w-4 ${isActionLoading ? "animate-spin" : ""}`} />
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
