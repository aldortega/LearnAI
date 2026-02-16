import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  topicTitle?: string;
  error: string | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteQuickstartTopicModal({
  isOpen,
  topicTitle,
  error,
  isDeleting,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Eliminar tema">
      <div className="space-y-4">
        <p className="text-sm text-foreground/75">
          Seguro que quieres eliminar este tema?
        </p>
        {topicTitle ? (
          <p className="truncate text-sm font-medium text-foreground">{topicTitle}</p>
        ) : null}
        {error ? (
          <p className="text-sm text-error" role="alert">
            {error}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={isDeleting}>
            Eliminar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
