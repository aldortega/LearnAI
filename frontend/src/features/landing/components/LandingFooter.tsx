import { LandingLogo } from "./LandingLogo";

export function LandingFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-10 sm:px-6">
        <LandingLogo />
        <p className="text-sm text-muted-foreground">
          © {new Date().getFullYear()} LearnAI · Estudiá a partir de tus propias fuentes
        </p>
      </div>
    </footer>
  );
}
