import type { ReactNode } from "react";

import { GraduationCap } from "lucide-react";

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
          "grid h-10 w-10 place-items-center rounded-lg bg-white/10 ring-1 ring-white/20",
        )}
      >
        <GraduationCap aria-hidden className="h-6 w-6 text-white" />
      </div>
      <div>
        <div className="text-lg font-bold tracking-tight text-white">
          LearnAI
        </div>
      </div>
    </div>
  );
}

export function AuthShell({ children, title, topSlot }: Props) {
  return (
    <div className="min-h-screen w-full bg-white lg:grid lg:grid-cols-2 dark:bg-zinc-950">
      {/* Left Panel - Branding */}
      <div className="relative hidden h-full flex-col justify-between bg-green-900 p-12 lg:flex">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-24 -top-24 h-[500px] w-[500px] rounded-full bg-green-800 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[600px] w-[600px] rounded-full bg-green-950 opacity-50 blur-3xl" />
        </div>

        <div className="relative z-10">
          <LogoMark />
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="text-4xl font-bold tracking-tight text-white">
            Estudio inteligente, resultados superiores.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-green-200">
            Transformá tus materiales en aprendizaje inteligente con una IA diseñada para llevar tu rendimiento al siguiente nivel.
          </p>

          
        </div>

        <div className="relative z-10 text-xs text-green-400">
          © {new Date().getFullYear()} LearnAI Inc.
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex min-h-screen flex-col justify-center px-4 py-12 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          <div className="mb-10 lg:hidden">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-green-900 text-white">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="text-lg font-bold text-green-900 dark:text-green-200">
                LearnAI
              </span>
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              {title}
            </h2>
            <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
              Ingresá a tu cuenta para continuar
            </p>
          </div>

          <div className="mt-8">
            <div className="mb-6">{topSlot}</div>

            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
