import type { ReactNode } from "react";

import { cn } from "../lib/cn";

type Props = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className }: Props) {
  return (
    <div
      className={cn(
        "rounded-3xl bg-white/80 p-6 shadow-[0_18px_55px_-35px_rgba(13,32,21,0.45)] ring-1 ring-emerald-100 backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
