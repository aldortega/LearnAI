import { useState } from "react";

import { useAuth } from "../../../shared/hooks/useAuth";
import type { Notebook } from "../../notebooks";
import { useDeleteNotebook, useNotebooks } from "../../notebooks";
import { CreateNotebookModal } from "../../notebooks/components/CreateNotebookModal";
import { DeleteNotebookModal } from "../../notebooks/components/DeleteNotebookModal";
import { EditNotebookModal } from "../../notebooks/components/EditNotebookModal";
import { CreateNotebookCard } from "../components/CreateNotebookCard";
import { Header } from "../components/Header";
import { NotebookCard } from "../components/NotebookCard";

function formatNotebookDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function HomePage() {
  const { user } = useAuth();
  const { notebooks, reload } = useNotebooks();
  const { deleteNotebook, isLoading, error, clearError } = useDeleteNotebook();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);

  const firstName = user?.name || "Estudiante";

  const handleEditNotebook = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setIsEditModalOpen(true);
  };

  const handleDeleteNotebook = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    clearError();
    setIsDeleteModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setSelectedNotebook(null);
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setSelectedNotebook(null);
    clearError();
  };

  const handleConfirmDelete = async () => {
    if (!selectedNotebook) return;

    try {
      await deleteNotebook(selectedNotebook.id);
      setIsDeleteModalOpen(false);
      setSelectedNotebook(null);
      await reload();
    } catch {
      // Error handled by hook.
    }
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50 dark:bg-zinc-950">
      <Header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md dark:bg-zinc-950/80" />

      <main className="px-8 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Hola, {firstName}
            </h1>
            <p className="mt-2 text-zinc-500 dark:text-zinc-400">
              Continuá con tus estudios o creá un nuevo espacio de trabajo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <CreateNotebookCard onClick={() => setIsCreateModalOpen(true)} />
            
            {notebooks.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                id={notebook.id}
                title={notebook.title}
                sourceCount={notebook.source_count}
                updatedAt={formatNotebookDate(notebook.updated_at)}
                emoji={notebook.emoji}
                onEdit={() => handleEditNotebook(notebook)}
                onDelete={() => handleDeleteNotebook(notebook)}
              />
            ))}
          </div>
        </div>
      </main>

      <CreateNotebookModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          void reload();
        }}
      />

      <EditNotebookModal
        isOpen={isEditModalOpen}
        notebook={selectedNotebook}
        onClose={handleCloseEditModal}
        onSuccess={() => {
          void reload();
        }}
      />

      <DeleteNotebookModal
        isOpen={isDeleteModalOpen}
        notebookName={selectedNotebook?.title}
        isDeleting={isLoading}
        error={error}
        onCancel={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
