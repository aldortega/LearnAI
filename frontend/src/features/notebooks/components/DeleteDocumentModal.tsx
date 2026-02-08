import { Modal } from "../../../shared/ui/Modal";
import { Button } from "../../../shared/ui/Button";

type Props = {
  isOpen: boolean;
  documentName?: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeleteDocumentModal({
  isOpen,
  documentName,
  isDeleting,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Eliminar fuente">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          ¿Seguro que quieres eliminar esta fuente?
        </p>
        {documentName ? (
          <p className="truncate text-sm font-medium text-foreground">
            {documentName}
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


