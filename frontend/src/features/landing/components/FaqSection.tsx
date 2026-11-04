import { ChevronDown } from "lucide-react";

import { LANDING_FAQS } from "../utils/landingContent";
import { SectionHeading } from "./SectionHeading";

export function FaqSection() {
  return (
    <section id="preguntas" aria-labelledby="preguntas-title" className="scroll-mt-16 py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-16">
        <SectionHeading id="preguntas-title" eyebrow="Preguntas frecuentes" title="Lo que suelen preguntarnos" />

        <div className="divide-y divide-border rounded-2xl border border-border bg-surface">
          {LANDING_FAQS.map((faq) => (
            <details key={faq.question} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-2xl px-6 py-5 text-left text-base font-medium text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                {faq.question}
                <ChevronDown
                  aria-hidden
                  strokeWidth={1.5}
                  className="size-4.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-open:rotate-180"
                />
              </summary>
              <p className="px-6 pb-5 text-sm leading-6 text-muted-foreground">{faq.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
