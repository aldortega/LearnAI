import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RegenerateFlashcardsModal({
  isOpen,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Regenerar flashcards">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Esto borrara las flashcards actuales y te llevara a la pantalla para
          generar nuevas.
        </p>
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
            Regenerar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
