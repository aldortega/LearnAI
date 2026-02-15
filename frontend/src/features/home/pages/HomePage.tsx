import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { useMemo, useState } from "react";

import { useAuth } from "../../../shared/hooks/useAuth";
import type { Notebook } from "../../notebooks";
import { useDeleteNotebook, useNotebooks } from "../../notebooks";
import { CreateNotebookModal } from "../../notebooks/components/CreateNotebookModal";
import { DeleteNotebookModal } from "../../notebooks/components/DeleteNotebookModal";
import { EditNotebookModal } from "../../notebooks/components/EditNotebookModal";
import { InviteUserModal } from "../../notebooks/components/InviteUserModal";
import { Header } from "../components/Header";
import { NotebookCard } from "../components/NotebookCard";
import { NotebookListItem } from "../components/NotebookListItem";

const INITIAL_VISIBLE_OWNED = 3;
const INITIAL_VISIBLE_SHARED = 2;

function formatRelativeDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Hace 1 día";
  if (diffDays < 7) return `Hace ${diffDays} días`;
  if (diffDays < 14) return "Hace 1 semana";
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`;
  if (diffDays < 60) return "Hace 1 mes";
  return `Hace ${Math.floor(diffDays / 30)} meses`;
}

export function HomePage() {
  const { user } = useAuth();
  const { notebooks, reload } = useNotebooks();
  const { deleteNotebook, isLoading, error, clearError } = useDeleteNotebook();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteModalSeed, setInviteModalSeed] = useState(0);
  const [selectedNotebook, setSelectedNotebook] = useState<Notebook | null>(null);
  const [showAllOwned, setShowAllOwned] = useState(false);
  const [showAllShared, setShowAllShared] = useState(false);

  const firstName = user?.name || "Estudiante";

  const { ownedNotebooks, sharedNotebooks } = useMemo(() => {
    const owned: Notebook[] = [];
    const shared: Notebook[] = [];
    for (const nb of notebooks) {
      if (nb.access_role === "owner") {
        owned.push(nb);
      } else {
        shared.push(nb);
      }
    }
    return { ownedNotebooks: owned, sharedNotebooks: shared };
  }, [notebooks]);

  const visibleOwned = showAllOwned
    ? ownedNotebooks
    : ownedNotebooks.slice(0, INITIAL_VISIBLE_OWNED);
  const visibleShared = showAllShared
    ? sharedNotebooks
    : sharedNotebooks.slice(0, INITIAL_VISIBLE_SHARED);

  const hasMoreOwned = ownedNotebooks.length > INITIAL_VISIBLE_OWNED;
  const hasMoreShared = sharedNotebooks.length > INITIAL_VISIBLE_SHARED;

  const handleEditNotebook = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setIsEditModalOpen(true);
  };

  const handleDeleteNotebook = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    clearError();
    setIsDeleteModalOpen(true);
  };

  const handleInviteNotebook = (notebook: Notebook) => {
    setSelectedNotebook(notebook);
    setInviteModalSeed((value) => value + 1);
    setIsInviteModalOpen(true);
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

  const handleCloseInviteModal = () => {
    setIsInviteModalOpen(false);
    setSelectedNotebook(null);
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
    <div className="min-h-screen w-full bg-muted">
      <Header className="sticky top-0 z-10 bg-surface/80 backdrop-blur-md" />

      <main className="px-8 py-10">
        <div className="mx-auto max-w-4xl">
          {/* Greeting + Create button */}
          <div className="mb-10 flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-foreground">
                Hola, {firstName}
              </h1>
              <p className="mt-2 text-muted-foreground">
                Continuá con tus estudios o creá una nueva notebook.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex shrink-0 items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" />
              Crear Notebook
            </button>
          </div>

          {/* Section: Tus notebooks */}
          <section className="mb-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground">
                Mis notebooks{" "}
                <span className="font-normal text-muted-foreground">
                  ({ownedNotebooks.length})
                </span>
              </h2>
              {hasMoreOwned ? (
                <button
                  type="button"
                  onClick={() => setShowAllOwned((v) => !v)}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  {showAllOwned ? "Ver menos" : "Ver más"}
                  {showAllOwned ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </button>
              ) : null}
            </div>

            <div className="rounded-xl border border-border bg-surface">
              {visibleOwned.length > 0 ? (
                visibleOwned.map((notebook, index) => (
                  <div key={notebook.id}>
                    {index > 0 ? (
                      <div className="mx-4 border-t border-border" />
                    ) : null}
                    <NotebookListItem
                      id={notebook.id}
                      title={notebook.title}
                      sourceCount={notebook.source_count}
                      updatedAt={formatRelativeDate(notebook.updated_at)}
                      emoji={notebook.emoji}
                      onInvite={() => handleInviteNotebook(notebook)}
                      onEdit={() => handleEditNotebook(notebook)}
                      onDelete={() => handleDeleteNotebook(notebook)}
                    />
                  </div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No tenés notebooks aún. ¡Creá tu primera!
                </div>
              )}
            </div>
          </section>

          {/* Section: Compartidos contigo */}
          {sharedNotebooks.length > 0 ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-foreground">
                  Compartidas conmigo{" "}
                  <span className="font-normal text-muted-foreground">
                    ({sharedNotebooks.length})
                  </span>
                </h2>
                {hasMoreShared ? (
                  <button
                    type="button"
                    onClick={() => setShowAllShared((v) => !v)}
                    className="flex items-center gap-1 text-sm font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    {showAllShared ? "Ver menos" : "Ver más"}
                    {showAllShared ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </button>
                ) : null}
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {visibleShared.map((notebook) => (
                  <NotebookCard
                    key={notebook.id}
                    id={notebook.id}
                    title={notebook.title}
                    sourceCount={notebook.source_count}
                    updatedAt={formatRelativeDate(notebook.updated_at)}
                    emoji={notebook.emoji}
                    accessRole={notebook.access_role}
                    onInvite={() => handleInviteNotebook(notebook)}
                    onEdit={() => handleEditNotebook(notebook)}
                    onDelete={() => handleDeleteNotebook(notebook)}
                  />
                ))}
              </div>
            </section>
          ) : null}
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

      <InviteUserModal
        key={inviteModalSeed}
        isOpen={isInviteModalOpen}
        notebookId={selectedNotebook?.id ?? null}
        notebookTitle={selectedNotebook?.title}
        onClose={handleCloseInviteModal}
        onSuccess={() => {
          void reload();
        }}
      />
    </div>
  );
}
