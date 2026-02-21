import { useState } from "react";

import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";

const PROMPT_MAX_LENGTH = 1200;

type Props = {
  isOpen: boolean;
  isRegenerating: boolean;
  onCancel: () => void;
  onConfirm: (prompt?: string) => void;
};

export function RegenerateMindmapModal({
  isOpen,
  isRegenerating,
  onCancel,
  onConfirm,
}: Props) {
  const [prompt, setPrompt] = useState("");

  const handleCancel = () => {
    setPrompt("");
    onCancel();
  };

  const handleConfirm = () => {
    const trimmedPrompt = prompt.trim();
    onConfirm(trimmedPrompt ? trimmedPrompt : undefined);
    setPrompt("");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Regenerar mapa mental">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Esto reemplazara el mapa mental actual con una nueva version.
        </p>
        <div className="space-y-2">
          <label
            htmlFor="mindmap-regenerate-topic-prompt"
            className="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
          >
            Tema especifico (opcional)
          </label>
          <textarea
            id="mindmap-regenerate-topic-prompt"
            value={prompt}
            disabled={isRegenerating}
            onChange={(event) => setPrompt(event.target.value)}
            rows={4}
            maxLength={PROMPT_MAX_LENGTH}
            placeholder="Ejemplo: Modelo OSI y protocolo TCP/IP"
            className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
          <p className="text-right text-xs text-muted-foreground">
            {prompt.length}/{PROMPT_MAX_LENGTH}
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="ghost"
            className="border border-border"
            onClick={handleCancel}
            disabled={isRegenerating}
          >
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            loading={isRegenerating}
            disabled={isRegenerating}
          >
            Regenerar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
