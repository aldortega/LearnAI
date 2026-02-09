import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";

type Props = {
  isOpen: boolean;
  isRegenerating: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function RegenerateQuickstartModal({
  isOpen,
  isRegenerating,
  onCancel,
  onConfirm,
}: Props) {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="Regenerar inicio rapido">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Esto regenerara el inicio rapido con las fuentes actuales.
        </p>
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onCancel} disabled={isRegenerating}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={onConfirm} loading={isRegenerating}>
            Regenerar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
