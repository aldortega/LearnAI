import { RefreshCcw } from "lucide-react";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  showRegenerateAction?: boolean;
  canRegenerate?: boolean;
  isRegenerating?: boolean;
  onRegenerate?: () => void;
};

export function QuizShell({
  children,
  showRegenerateAction = false,
  canRegenerate = false,
  isRegenerating = false,
  onRegenerate,
}: Props) {
  const handleRegenerate = () => {
    if (!onRegenerate || !canRegenerate || isRegenerating) return;
    onRegenerate();
  };

  return (
    <div className="flex h-full flex-col bg-surface">
      <div className="flex h-[45px] items-center justify-between border-b border-border px-4">
        <h2 className="text-sm font-semibold text-foreground">Quiz</h2>
        {showRegenerateAction ? (
          <button
            type="button"
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleRegenerate}
            disabled={!canRegenerate || isRegenerating}
            aria-label="Regenerar quiz"
            title="Regenerar quiz"
          >
            <RefreshCcw
              className={`h-4 w-4 ${isRegenerating ? "animate-spin" : ""}`}
            />
          </button>
        ) : null}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
