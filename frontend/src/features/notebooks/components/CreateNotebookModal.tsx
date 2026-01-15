import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";
import { TextArea } from "../../../shared/ui/TextArea";
import { TextField } from "../../../shared/ui/TextField";
import { useCreateNotebook } from "../hooks/useCreateNotebook";
import {
  type NotebookCreateInput,
  notebookCreateSchema,
} from "../utils/notebookSchemas";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

export function CreateNotebookModal({ isOpen, onClose, onSuccess }: Props) {
  const { createNotebook, isLoading, error, clearError } = useCreateNotebook();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NotebookCreateInput>({
    resolver: zodResolver(notebookCreateSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset();
      clearError();
    }
  }, [isOpen, reset, clearError]);

  const onSubmit = async (values: NotebookCreateInput) => {
    try {
      await createNotebook(values);
      onSuccess();
      onClose();
    } catch {
      // Error is handled by hook and displayed in UI
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Crear nuevo notebook"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        ) : null}

        <TextField
          label="Título"
          name="title"
          placeholder="Ej: Biología Celular"
          required
          autoComplete="off"
          error={errors.title?.message}
          inputProps={register("title")}
        />

        <TextArea
          label="Descripción"
          name="description"
          placeholder="Breve descripción del contenido..."
          rows={3}
          error={errors.description?.message}
          inputProps={register("description")}
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" variant="primary" loading={isLoading}>
            Crear notebook
          </Button>
        </div>
      </form>
    </Modal>
  );
}
