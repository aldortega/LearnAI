import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  slideTitle: string;
  prompt: string;
  isRegenerating: boolean;
  error: string | null;
  onPromptChange: (value: string) => void;
  onCancel: () => void;
  onRegenerate: () => void;
};

export function EditPresentationSlideModal({
  isOpen,
  slideTitle,
  prompt,
  isRegenerating,
  error,
  onPromptChange,
  onCancel,
  onRegenerate,
}: Props) {
  const trimmedPrompt = prompt.trim();

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={`Editar diapositiva: ${slideTitle}`}>
      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          maxLength={12000}
          rows={10}
          disabled={isRegenerating}
          className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{prompt.length}/12000</p>
          {error ? (
            <p className="text-xs text-error" role="alert">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex items-center justify-end gap-3 pt-1">
          <Button variant="ghost" onClick={onCancel} disabled={isRegenerating}>
            Cancelar
          </Button>
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
    </Modal>
  );
}
