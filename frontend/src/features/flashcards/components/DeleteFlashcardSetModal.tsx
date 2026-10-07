import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  setTitle?: string;
  isDeleting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteFlashcardSetModal({
  isOpen,
  setTitle,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Eliminar set de flashcards">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          ¿Seguro que quieres eliminar este set? Esta acción no se puede deshacer.
        </p>
        {setTitle ? (
          <p className="truncate text-sm font-medium text-foreground">{setTitle}</p>
        ) : null}
        {error ? (
          <p className="text-sm text-red-600" role="alert">
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
