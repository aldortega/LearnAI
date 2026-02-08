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
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
        variant === "primary" &&
          cn(
            "bg-primary text-primary-foreground shadow-sm",
            !isDisabled && "hover:bg-primary-hover active:opacity-95",
          ),
        variant === "ghost" &&
          cn(
            "bg-transparent text-muted-foreground hover:text-foreground",
            !isDisabled && "hover:bg-muted",
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
