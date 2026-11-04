import { GraduationCap } from "lucide-react";
import { Link } from "react-router-dom";

export function LandingLogo() {
  return (
    <Link
      to="/"
      className="flex items-center gap-2 rounded-lg transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <span className="grid size-7 place-items-center rounded-md bg-primary text-primary-foreground">
        <GraduationCap aria-hidden className="size-4" strokeWidth={1.5} />
      </span>
      <span className="text-lg font-semibold tracking-tight text-foreground">LearnAI</span>
    </Link>
  );
}
