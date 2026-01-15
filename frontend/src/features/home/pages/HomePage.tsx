import {
  Atom,
  Brain,
  Dna,
  FlaskConical,
  GraduationCap,
  Landmark,
  Megaphone,
  Scale,
  Terminal,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

import { useAuth } from "../../../shared/hooks/useAuth";
import { useNotebooks } from "../../notebooks";
import { CreateNotebookModal } from "../../notebooks/components/CreateNotebookModal";
import { CreateNotebookCard } from "../components/CreateNotebookCard";
import { Header } from "../components/Header";
import { NotebookCard } from "../components/NotebookCard";

const notebookIcons = [
  Dna,
  Landmark,
  Atom,
  Brain,
  TrendingUp,
  Terminal,
  GraduationCap,
  Scale,
  FlaskConical,
  Megaphone,
];

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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const firstName = user?.name || "Estudiante";

  return (
    <div className="min-h-screen w-full bg-zinc-50">
      <Header />

      <main className="px-8 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-10">
            <h1 className="text-3xl font-bold tracking-tight text-zinc-900">
              Hola, {firstName}
            </h1>
            <p className="mt-2 text-zinc-500">
              Continuá con tus estudios o creá un nuevo espacio de trabajo.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <CreateNotebookCard onClick={() => setIsCreateModalOpen(true)} />
            
            {notebooks.map((notebook, index) => {
              const Icon = notebookIcons[index % notebookIcons.length];

              return (
                <NotebookCard
                  key={notebook.id}
                  title={notebook.title}
                  sourceCount={0}
                  updatedAt={formatNotebookDate(notebook.updated_at)}
                  icon={Icon}
                />
              );
            })}
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
    </div>
  );
}
