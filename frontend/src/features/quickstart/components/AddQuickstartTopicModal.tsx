import { useMemo, useState } from "react";

import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  isAdding: boolean;
  isDisabled: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (title: string) => Promise<void>;
};

export function AddQuickstartTopicModal({
  isOpen,
  isAdding,
  isDisabled,
  error,
  onCancel,
  onConfirm,
}: Props) {
  const [topicTitle, setTopicTitle] = useState("");
  const trimmedTopicTitle = useMemo(() => topicTitle.trim(), [topicTitle]);

  const handleConfirm = async () => {
    if (!trimmedTopicTitle || isDisabled || isAdding) return;
    await onConfirm(trimmedTopicTitle);
    setTopicTitle("");
  };

  const handleCancel = () => {
    setTopicTitle("");
    onCancel();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title="Agregar tema">
      <div className="space-y-4">
        <input
          type="text"
          value={topicTitle}
          onChange={(event) => setTopicTitle(event.target.value)}
          maxLength={120}
          placeholder="Escribe un tema para agregar"
          disabled={isDisabled || isAdding}
          className="w-full rounded-xl border border-border-strong bg-surface px-3 py-2 text-sm text-foreground outline-none transition focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
        />
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={handleCancel} disabled={isAdding}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              void handleConfirm();
            }}
            loading={isAdding}
            disabled={!trimmedTopicTitle || isDisabled}
          >
            Agregar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
