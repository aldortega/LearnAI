import { Button } from "../../../shared/ui/Button";

type Props = {
  isOpen: boolean;
  prompt: string;
  isRegenerating: boolean;
  error: string | null;
  onPromptChange: (value: string) => void;
  onRegenerate: () => void;
};

export function SlideEditPromptPanel({
  isOpen,
  prompt,
  isRegenerating,
  error,
  onPromptChange,
  onRegenerate,
}: Props) {
  if (!isOpen || isRegenerating) return null;

  const trimmedPrompt = prompt.trim();
  const inputClassName = error
    ? "w-full rounded-xl border border-error bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary"
    : "w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <aside className="w-full">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-56 flex-1">
        <input
          type="text"
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          maxLength={12000}
          disabled={isRegenerating}
          className={inputClassName}
          placeholder="Escribe que quieres cambiar en esta diapositiva"
        />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="primary"
            loading={isRegenerating}
            disabled={!trimmedPrompt || isRegenerating}
            onClick={onRegenerate}
          >
            Regenerar
          </Button>
        </div>
      </div>
    </aside>
  );
}
