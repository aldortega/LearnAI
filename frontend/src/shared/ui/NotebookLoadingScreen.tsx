type Props = {
  message?: string;
};

export function NotebookLoadingScreen({
  message = "Cargando cuaderno...",
}: Props) {
  return (
    <div className="min-h-screen bg-primary/10">
      <div className="mx-auto flex min-h-screen max-w-5xl items-center justify-center px-4">
        <div className="rounded-3xl bg-surface/70 px-6 py-5 text-sm font-semibold text-primary ring-1 ring-border backdrop-blur-xl dark:ring-primary/30">
          {message}
        </div>
      </div>
    </div>
  );
}
