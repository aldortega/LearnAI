import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  title: string;
  prompt: string;
  isGenerating: boolean;
  error: string | null;
  onPromptChange: (value: string) => void;
  onCancel: () => void;
  onGenerate: () => void;
};

export function EditReportPromptModal({
  isOpen,
  title,
  prompt,
  isGenerating,
  error,
  onPromptChange,
  onCancel,
  onGenerate,
}: Props) {
  const trimmedPrompt = prompt.trim();

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={`Editar prompt: ${title}`}>
      <div className="space-y-4">
        <textarea
          value={prompt}
          onChange={(event) => onPromptChange(event.target.value)}
          maxLength={12000}
          rows={10}
          disabled={isGenerating}
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
          <Button variant="ghost" onClick={onCancel} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            loading={isGenerating}
            disabled={!trimmedPrompt || isGenerating}
            onClick={onGenerate}
          >
            Generar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
