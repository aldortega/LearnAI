import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

import { UserMenu } from "../../auth/components/UserMenu";
import { cn } from "../../../shared/lib/cn";

type Props = {
  title?: string;
  className?: string;
};

export function Header({ title, className }: Props) {
  return (
    <header
      className={cn(
        "flex h-16 w-full items-center justify-between border-b border-zinc-200 bg-white px-6",
        "dark:border-zinc-800 dark:bg-zinc-950",
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-900 text-white">
            <GraduationCap className="h-5 w-5 dark:text-emerald-200" />
          </div>
          <span className="text-lg font-bold tracking-tight text-emerald-900 dark:text-emerald-200">
            LearnAI
          </span>
        </Link>

        {title ? (
          <>
            <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
            <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {title}
            </h1>
          </>
        ) : null}
      </div>

      <UserMenu />
    </header>
  );
}
// Force rebuild
