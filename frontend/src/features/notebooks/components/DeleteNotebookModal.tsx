import { Modal } from "../../../shared/ui/Modal";
import { Button } from "../../../shared/ui/Button";

type Props = {
  isOpen: boolean;
  notebookName?: string;
  isDeleting: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteNotebookModal({
  isOpen,
  notebookName,
  isDeleting,
  error,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Eliminar notebook">
      <div className="space-y-4">
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-error bg-error/10 px-4 py-3 text-sm text-error"
          >
            {error}
          </div>
        ) : null}
        <p className="text-sm text-muted-foreground">
          ¿Seguro que quieres eliminar este notebook? También se eliminarán sus
          fuentes.
        </p>
        {notebookName ? (
          <p className="truncate text-sm font-medium text-foreground">
            {notebookName}
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


