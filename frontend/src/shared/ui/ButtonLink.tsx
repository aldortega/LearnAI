import type { MouseEventHandler, ReactNode } from "react";
import { Link } from "react-router-dom";

import { cn } from "../lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "inverse";
type Size = "md" | "lg";

type CommonProps = {
  variant?: Variant;
  size?: Size;
  rightIcon?: ReactNode;
  className?: string;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  children: ReactNode;
};

type Props = CommonProps & ({ to: string; href?: never } | { href: string; to?: never });

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary: "bg-surface text-foreground ring-1 ring-border hover:bg-muted-hover",
  ghost: "bg-transparent text-muted-foreground hover:bg-muted-hover hover:text-foreground",
  inverse:
    "bg-primary-foreground text-primary hover:bg-primary-foreground/90 focus-visible:ring-primary-foreground focus-visible:ring-offset-primary",
};

const sizeClasses: Record<Size, string> = {
  md: "h-9 px-4 text-sm",
  lg: "h-12 px-5 text-base",
};

export function ButtonLink({
  variant = "primary",
  size = "md",
  rightIcon,
  className,
  onClick,
  children,
  ...target
}: Props) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-[color,background-color,box-shadow,transform] duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.98]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    variant !== "inverse" && "focus-visible:ring-primary focus-visible:ring-offset-background",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );

  const content = (
    <>
      <span>{children}</span>
      {rightIcon}
    </>
  );

  if (target.href !== undefined) {
    return (
      <a href={target.href} className={classes} onClick={onClick}>
        {content}
      </a>
    );
  }

  return (
    <Link to={target.to} className={classes} onClick={onClick}>
      {content}
    </Link>
  );
}
