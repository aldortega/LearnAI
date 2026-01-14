import { 
  Dna, 
  Landmark, 
  Atom, 
  Brain, 
  TrendingUp, 
  Terminal, 
  GraduationCap, 
  Scale, 
  FlaskConical, 
  Megaphone 
} from "lucide-react";

import { Header } from "../components/Header";
import { NotebookCard } from "../components/NotebookCard";
import { CreateNotebookCard } from "../components/CreateNotebookCard";
import { useAuth } from "../../../shared/hooks/useAuth";

export function HomePage() {
  const { user } = useAuth();
  
  // Mock data
  const notebooks = [
    {
      id: "1",
      title: "Introducción a la Biología Celular",
      sourceCount: 4,
      updatedAt: "Hace 2 horas",
      icon: Dna,
    },
    {
      id: "2",
      title: "Apuntes de Historia Argentina",
      sourceCount: 12,
      updatedAt: "Ayer",
      icon: Landmark,
    },
    {
      id: "3",
      title: "Resumen para el final de Física II",
      sourceCount: 2,
      updatedAt: "Hace 3 días",
      icon: Atom,
    },
    {
      id: "4",
      title: "Investigación sobre LLMs y RAG",
      sourceCount: 8,
      updatedAt: "Hace 1 semana",
      icon: Brain,
    },
    {
      id: "5",
      title: "Economía: Macro y Micro",
      sourceCount: 5,
      updatedAt: "Hace 2 semanas",
      icon: TrendingUp,
    },
    {
      id: "6",
      title: "Proyecto de Sistemas Operativos",
      sourceCount: 3,
      updatedAt: "Hace 1 mes",
      icon: Terminal,
    },
    {
      id: "7",
      title: "Tesis: IA en Educación",
      sourceCount: 15,
      updatedAt: "Hace 2 meses",
      icon: GraduationCap,
    },
    {
      id: "8",
      title: "Apuntes de Derecho Constitucional",
      sourceCount: 6,
      updatedAt: "Hace 3 meses",
      icon: Scale,
    },
    {
      id: "9",
      title: "Química Orgánica - Unidad 4",
      sourceCount: 1,
      updatedAt: "Hace 4 meses",
      icon: FlaskConical,
    },
    {
      id: "10",
      title: "Marketing Digital y SEO",
      sourceCount: 9,
      updatedAt: "Hace 6 meses",
      icon: Megaphone,
    },
  ];

  // Get first name for welcome message
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
            <CreateNotebookCard />
            {notebooks.map((notebook) => (
              <NotebookCard
                key={notebook.id}
                title={notebook.title}
                sourceCount={notebook.sourceCount}
                updatedAt={notebook.updatedAt}
                icon={notebook.icon}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
