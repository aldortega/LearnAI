import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "../lib/cn";
import { Spinner } from "./Spinner";

type Variant = "primary" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function Button({
  variant = "primary",
  loading = false,
  className,
  disabled,
  leftIcon,
  rightIcon,
  children,
  ...props
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <button
      type="button"
      {...props}
      disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        "dark:focus-visible:ring-emerald-400 dark:focus-visible:ring-offset-zinc-900",
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        variant === "primary" &&
          cn(
            "bg-emerald-900 text-white shadow-sm dark:bg-emerald-400 dark:text-emerald-950",
            !isDisabled &&
              "hover:bg-emerald-800 active:bg-emerald-950 dark:hover:bg-emerald-300 dark:active:bg-emerald-500",
          ),
        variant === "ghost" &&
          cn(
            "bg-transparent text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
            !isDisabled && "hover:bg-zinc-100 dark:hover:bg-zinc-800/70",
          ),
        className,
      )}
    >
      {loading ? <Spinner /> : leftIcon}
      <span>{children}</span>
      {rightIcon}
    </button>
  );
}
