import type { ReactNode } from "react";

import { GraduationCap, Lightbulb } from "lucide-react";

import { cn } from "../../../shared/lib/cn";

type Props = {
  children: ReactNode;
  title: string;
  subtitle: string;
  topSlot?: ReactNode;
};

function LogoMark() {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "grid h-10 w-10 place-items-center rounded-2xl",
          "bg-[color:var(--color-fern-100)] ring-1 ring-[color:var(--color-fern-200)]",
        )}
      >
        <GraduationCap
          aria-hidden
          className="h-6 w-6 text-[color:var(--color-fern-700)]"
        />
      </div>
      <div>
        <div className="text-lg font-extrabold tracking-tight text-[color:var(--color-fern-950)]">
          ScholarAI
        </div>
        <div className="text-xs font-medium text-[color:var(--color-fern-500)]">
          Study smarter
        </div>
      </div>
    </div>
  );
}

function HeroCard() {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-[color:var(--color-fern-800)] p-6 ring-1 ring-white/10">
      <div className="absolute -left-10 -top-16 h-48 w-48 rounded-full bg-[color:var(--color-celadon-500)] opacity-20 blur-2xl" />
      <div className="absolute -bottom-20 -right-14 h-64 w-64 rounded-full bg-[color:var(--color-frosted-mint-500)] opacity-15 blur-3xl" />

      <div className="relative">
        <div className="text-sm font-semibold text-white/80">Daily Streak</div>
        <div className="mt-2 text-2xl font-extrabold tracking-tight text-white">
          Dominá tus documentos
          <br />
          con IA
        </div>
        <p className="mt-3 max-w-sm text-sm leading-6 text-white/70">
          Subí tus materiales de estudio, generá quizzes y mejorá tu retención
          en minutos.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/80 ring-1 ring-white/10">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/10">
            <Lightbulb aria-hidden className="h-5 w-5" />
          </span>
          <div>
            <div className="font-semibold">Vas genial</div>
            <div className="text-xs text-white/60">seguí así</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AuthShell({ children, title, topSlot }: Props) {
  return (
    <div className="min-h-screen bg-[color:var(--color-frosted-mint-50)]">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 gap-10 px-4 py-10 md:grid-cols-2 md:items-center">
        <div className="space-y-8">
          <LogoMark />
          <HeroCard />
          <p className="text-xs text-[color:var(--color-fern-500)]">
            © {new Date().getFullYear()} ScholarAI Inc.
          </p>
        </div>

        <div className="w-full">
          <div className="mx-auto w-full max-w-md">
            {topSlot}
            <div className="mt-6">
              <div className="rounded-3xl bg-white/70 p-6 shadow-[0_20px_70px_-55px_rgba(13,32,21,0.45)] ring-1 ring-[color:var(--color-fern-100)] backdrop-blur-xl">
                <h1 className="text-3xl font-extrabold tracking-tight text-[color:var(--color-fern-950)]">
                  {title}
                </h1>
                {/* <p className="mt-2 text-sm text-[color:var(--color-fern-600)]">
                  {subtitle}
                </p> */}
                <div className="mt-6">{children}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
