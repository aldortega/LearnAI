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
        "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-green-400)] focus-visible:ring-offset-2 focus-visible:ring-offset-white",
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        variant === "primary" &&
          cn(
            "bg-[color:var(--color-fern-500)] text-white shadow-[0_14px_30px_-18px_rgba(19,32,21,0.65)]",
            !isDisabled &&
              "hover:bg-[color:var(--color-fern-600)] active:bg-[color:var(--color-fern-700)]",
          ),
        variant === "ghost" &&
          cn(
            "bg-transparent text-[color:var(--color-fern-800)] ring-1 ring-[color:var(--color-fern-200)]",
            !isDisabled &&
              "hover:bg-[color:var(--color-fern-50)] active:bg-[color:var(--color-fern-100)]",
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
