import { Link } from "react-router-dom";

import { LANDING_NAV_LINKS } from "../utils/landingContent";
import { scrollToSection } from "../utils/scrollToSection";
import { LandingLogo } from "./LandingLogo";

const linkClasses =
  "rounded text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2">
          <LandingLogo />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} LearnAI · Estudiá a partir de tus propias fuentes
          </p>
        </div>

        <nav aria-label="Pie de página" className="flex flex-wrap gap-x-6 gap-y-2">
          {LANDING_NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={linkClasses} onClick={scrollToSection}>
              {link.label}
            </a>
          ))}
          <Link to="/login" className={linkClasses}>
            Ingresar
          </Link>
        </nav>
      </div>
    </footer>
  );
}
