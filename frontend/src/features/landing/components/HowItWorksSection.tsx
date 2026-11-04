import { LANDING_STEPS } from "../utils/landingContent";
import { CitationMark } from "./CitationMark";
import { SectionHeading } from "./SectionHeading";

export function HowItWorksSection() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-title"
      className="scroll-mt-16 border-y border-border bg-surface py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="como-funciona-title"
          eyebrow="Cómo funciona"
          title="De tus apuntes a una sesión de estudio en minutos"
        />

        <ol className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {LANDING_STEPS.map((step, index) => (
            <li key={step.title} className="border-t border-border-strong pt-6">
              <CitationMark label={index + 1} />
              <h3 className="mt-4 text-base font-medium text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
