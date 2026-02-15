import { Modal } from "../../../shared/ui/Modal";
import { Button } from "../../../shared/ui/Button";

type Props = {
  isOpen: boolean;
  notebookName?: string;
  isLeaving: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function LeaveNotebookModal({
  isOpen,
  notebookName,
  isLeaving,
  error,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Salir de la notebook">
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
          ¿Seguro que quieres salir de esta notebook? Dejarás de tener acceso a
          ella.
        </p>
        {notebookName ? (
          <p className="truncate text-sm font-medium text-foreground">
            {notebookName}
          </p>
        ) : null}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={isLeaving}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={isLeaving}>
            Salir
          </Button>
        </div>
      </div>
    </Modal>
  );
}
