import { Moon, Sun } from "lucide-react";
import { Link } from "react-router-dom";

import { useTheme } from "../../../shared/hooks/useTheme";
import { cn } from "../../../shared/lib/cn";
import { ButtonLink } from "../../../shared/ui/ButtonLink";
import { useScrolledPast } from "../hooks/useScrolledPast";
import { LandingLogo } from "./LandingLogo";

const quietLinkClasses =
  "rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function LandingNavbar() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const isScrolled = useScrolledPast(8);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isScrolled ? "bg-background/85 backdrop-blur-md" : "bg-transparent",
      )}
    >
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6"
      >
        <LandingLogo />

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={isDark ? "Activar modo claro" : "Activar modo oscuro"}
            className="grid size-9 cursor-pointer place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {isDark ? (
              <Sun aria-hidden className="size-4" strokeWidth={1.5} />
            ) : (
              <Moon aria-hidden className="size-4" strokeWidth={1.5} />
            )}
          </button>
          <Link to="/login" className={`hidden sm:inline-flex ${quietLinkClasses}`}>
            Ingresar
          </Link>
          <ButtonLink to="/register" className="ml-1">
            Crear cuenta
          </ButtonLink>
        </div>
      </nav>
    </header>
  );
}
