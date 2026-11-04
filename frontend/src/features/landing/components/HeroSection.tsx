import { ArrowRight } from "lucide-react";

import { ButtonLink } from "../../../shared/ui/ButtonLink";
import { scrollToSection } from "../utils/scrollToSection";
import { ProductPreview } from "./ProductPreview";

export function HeroSection() {
  return (
    <section className="flex items-center lg:min-h-[calc(100svh-4rem)]">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:py-16">
        <div className="motion-safe:animate-fade-up">
          <h1 className="text-4xl font-medium leading-[1.08] tracking-tight text-balance text-foreground sm:text-5xl lg:text-6xl lg:leading-[1.04]">
            Estudiá cualquier tema a partir de tus propios materiales
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-pretty text-muted-foreground">
            Subí tus apuntes. LearnAI te responde, te evalúa y te arma material de estudio,
            siempre citando de dónde sale cada respuesta.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              to="/register"
              size="lg"
              rightIcon={<ArrowRight aria-hidden className="size-4" strokeWidth={1.5} />}
            >
              Empezar ahora
            </ButtonLink>
            <ButtonLink
              href="#como-funciona"
              size="lg"
              variant="secondary"
              onClick={scrollToSection}
            >
              Ver cómo funciona
            </ButtonLink>
          </div>
        </div>

        <ProductPreview />
      </div>
    </section>
  );
}
