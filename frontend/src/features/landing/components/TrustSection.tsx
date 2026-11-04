import { LANDING_TRUST_ITEMS } from "../utils/landingContent";
import { SectionHeading } from "./SectionHeading";

export function TrustSection() {
  return (
    <section
      aria-labelledby="confianza-title"
      className="border-y border-border bg-surface py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="confianza-title"
          eyebrow="Confianza"
          title="Estudiá con respuestas que podés verificar"
        />

        <ul className="mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {LANDING_TRUST_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.title} className="border-t border-border-strong pt-6">
                <Icon aria-hidden className="size-4.5 text-primary" strokeWidth={1.5} />
                <h3 className="mt-4 text-base font-medium text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
