import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

import { Button } from "../../../shared/ui/Button";
import { Modal } from "../../../shared/ui/Modal";
import { TextArea } from "../../../shared/ui/TextArea";
import { TextField } from "../../../shared/ui/TextField";
import type { Notebook } from "../types/notebooks.types";
import { useUpdateNotebook } from "../hooks/useUpdateNotebook";
import {
  type NotebookUpdateInput,
  notebookUpdateSchema,
} from "../utils/notebookSchemas";

type Props = {
  isOpen: boolean;
  notebook: Notebook | null;
  onClose: () => void;
  onSuccess: () => void;
};

export function EditNotebookModal({
  isOpen,
  notebook,
  onClose,
  onSuccess,
}: Props) {
  const { updateNotebook, isLoading, error, clearError } = useUpdateNotebook();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<NotebookUpdateInput>({
    resolver: zodResolver(notebookUpdateSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        title: notebook?.title ?? "",
        description: notebook?.description ?? "",
      });
      clearError();
    }
  }, [isOpen, notebook, reset, clearError]);

  const onSubmit = async (values: NotebookUpdateInput) => {
    if (!notebook) return;

    try {
      await updateNotebook(notebook.id, values);
      onSuccess();
      onClose();
    } catch {
      // Error handled by hook.
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Editar notebook"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error ? (
          <div
            role="alert"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
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
            Guardar cambios
          </Button>
        </div>
      </form>
    </Modal>
  );
}
