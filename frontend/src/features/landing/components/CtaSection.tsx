import { ArrowRight } from "lucide-react";

import { ButtonLink } from "../../../shared/ui/ButtonLink";

export function CtaSection() {
  return (
    <section aria-labelledby="cta-title" className="px-4 pb-24 sm:px-6 sm:pb-32">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 rounded-2xl bg-primary px-6 py-12 sm:px-12 sm:py-16 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl">
          <h2
            id="cta-title"
            className="text-3xl font-medium tracking-tight text-balance text-primary-foreground sm:text-4xl"
          >
            Tu próximo examen empieza con tus propios apuntes
          </h2>
          <p className="mt-4 text-lg leading-8 text-pretty text-primary-foreground/80">
            Creá tu primer cuaderno, subí tus materiales y empezá a estudiar en minutos.
          </p>
        </div>
        <ButtonLink
          to="/register"
          size="lg"
          variant="inverse"
          className="shrink-0 self-start lg:self-auto"
          rightIcon={<ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />}
        >
          Crear mi cuenta
        </ButtonLink>
      </div>
    </section>
  );
}
