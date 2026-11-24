import { ArrowRight, BookOpen, Sparkles, UploadCloud } from "lucide-react";
import { Fragment } from "react";

const PILLARS = [
  { icon: BookOpen, label: "Creá un cuaderno" },
  { icon: UploadCloud, label: "Subí tus fuentes" },
  { icon: Sparkles, label: "Estudiá" },
];

export function WelcomeScene() {
  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4">
      {PILLARS.map((pillar, i) => (
        <Fragment key={pillar.label}>
          <div
            className="flex w-20 animate-fade-up flex-col items-center gap-2 text-center sm:w-24"
            style={{ animationDelay: `${i * 200}ms` }}
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <pillar.icon className="h-7 w-7" />
            </span>
            <span className="text-xs font-semibold text-foreground">{pillar.label}</span>
          </div>
          {i < PILLARS.length - 1 ? <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
        </Fragment>
      ))}
    </div>
  );
}
