import { useAuth } from "../auth/AuthContext";

export const HomePage = () => {
  const { user, logout } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-md-surface text-md-on-surface">
      <div
        className="pointer-events-none absolute -left-32 top-20 h-72 w-72 rounded-full bg-md-primary/15 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-md-secondary-container/50 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative mx-auto flex min-h-screen max-w-5xl items-center px-6 py-16">
        <div className="w-full rounded-[32px] bg-md-surface-container p-10 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:shadow-md">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-md-on-surface">
                Hola, {user?.name ?? "estudiante"} 👋
              </h1>
              <p className="mt-2 text-md-on-surface-variant">
                Tu espacio está listo. Comienza creando tu primer tema de estudio.
              </p>
            </div>
            <button
              onClick={() => logout()}
              className="h-12 rounded-full border border-md-outline px-6 text-sm font-semibold text-md-primary transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-md-primary/10 active:scale-95"
            >
              Cerrar sesión
            </button>
          </div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              "Sube PDFs y genera rutas",
              "Practica con quizzes diarios",
              "Mide tu progreso semanal",
            ].map((item) => (
              <div
                key={item}
                className="group rounded-3xl bg-md-surface-container-low p-5 shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:shadow-md hover:scale-[1.02]"
              >
                <div className="text-sm font-semibold text-md-on-surface">{item}</div>
                <p className="mt-2 text-sm text-md-on-surface-variant">
                  Personaliza tu plan y mantén la racha con sesiones cortas.
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
