import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  isClearing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ClearChatModal({
  isOpen,
  isClearing,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Limpiar chat">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Esto eliminará todo el historial de conversación de este cuaderno.
        </p>
        <p className="text-sm text-muted-foreground">
          Esta acción no se puede deshacer.
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={isClearing}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={isClearing}>
            Limpiar
          </Button>
        </div>
      </div>
    </Modal>
  );
}


