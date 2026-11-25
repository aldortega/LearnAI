import { ArrowUp } from "lucide-react";
import type { KeyboardEvent } from "react";

import { Button } from "../../../shared/ui/Button";
import { cn } from "../../../shared/lib/cn";

type Props = {
  value: string;
  error: string | null;
  isInputDisabled: boolean;
  isSendDisabled: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function ChatComposer({
  value,
  error,
  isInputDisabled,
  isSendDisabled,
  onChange,
  onSubmit,
}: Props) {
  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey) return;
    event.preventDefault();
    onSubmit();
  };

  return (
    <div className="px-4 pb-4 pt-2">
      <div className="mx-auto max-w-3xl space-y-2">
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-error bg-error/10 px-3 py-2 text-xs text-error"
          >
            {error}
          </div>
        ) : null}
        <div
          className={cn(
            "flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 shadow-lg transition-colors",
            "focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20",
            isInputDisabled && "opacity-60",
          )}
        >
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Preguntá sobre tus fuentes..."
            aria-label="Mensaje"
            className={cn(
              "max-h-40 min-h-[44px] min-w-0 flex-1 resize-none bg-transparent px-2 py-2.5 text-base text-foreground sm:text-sm",
              "placeholder:truncate placeholder:text-muted-foreground focus:outline-none",
              "disabled:cursor-not-allowed",
            )}
            disabled={isInputDisabled}
            rows={1}
          />
          <Button
            onClick={onSubmit}
            disabled={isSendDisabled}
            aria-label="Enviar mensaje"
            title="Enviar"
            className="size-10 shrink-0 rounded-xl p-0"
          >
            <ArrowUp aria-hidden className="size-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>
    </div>
  );
}
