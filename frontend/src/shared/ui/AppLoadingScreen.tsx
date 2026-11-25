import { GraduationCap } from "lucide-react";

type Props = {
  message?: string;
};

export function AppLoadingScreen({ message = "Cargando LearnAI" }: Props) {
  return (
    <div
      role="status"
      className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-surface px-4"
    >
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground animate-breathe motion-reduce:animate-none">
        <GraduationCap className="h-8 w-8" aria-hidden="true" />
      </div>
      <span className="text-lg font-bold tracking-tight text-primary" aria-hidden="true">
        LearnAI
      </span>
      <div className="h-[3px] w-32 overflow-hidden rounded-full bg-muted-hover" aria-hidden="true">
        <div className="h-full w-2/5 rounded-full bg-primary animate-progress-indeterminate motion-reduce:w-full motion-reduce:animate-none" />
      </div>
      <span className="sr-only">{message}</span>
    </div>
  );
}
