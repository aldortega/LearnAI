import { AnatomyAnswerCard } from "./anatomy/AnatomyAnswerCard";
import { AnatomyNotes } from "./anatomy/AnatomyNotes";
import { SectionHeading } from "./SectionHeading";

export function AnswerAnatomySection() {
  return (
    <section aria-labelledby="respuesta-title" className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="respuesta-title"
          eyebrow="Una respuesta, desarmada"
          title="Sabés de dónde sale cada cosa que estudiás"
        />

        <div className="mt-16 grid items-start gap-12 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-16">
          <AnatomyAnswerCard />
          <AnatomyNotes />
        </div>
      </div>
    </section>
  );
}
