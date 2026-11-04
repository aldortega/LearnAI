import { GraduationCap } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { NotificationBell } from "../../notifications";
import { UserMenu } from "../../auth/components/UserMenu";
import { cn } from "../../../shared/lib/cn";

type Props = {
  title?: string;
  className?: string;
  actions?: ReactNode;
};

export function Header({ title, className, actions }: Props) {
  return (
    <header
      className={cn(
        "flex h-16 w-full items-center justify-between gap-3 border-b border-border bg-surface px-4 sm:px-6",
        "dark:border-border",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Link
          to="/"
          className="flex shrink-0 items-center gap-2 transition-opacity hover:opacity-80"
        >
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <span className={cn("text-lg font-bold tracking-tight text-primary", title && "hidden sm:inline")}>
            LearnAI
          </span>
        </Link>

        {title ? (
          <>
            <div className="hidden h-4 w-px bg-muted-hover sm:block" />
            <h1 className="truncate text-sm font-semibold text-foreground">
              {title}
            </h1>
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        {actions}
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
// Force rebuild

