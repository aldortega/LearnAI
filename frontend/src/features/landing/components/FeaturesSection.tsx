import { LANDING_FEATURES } from "../utils/landingContent";
import { FeatureCard } from "./FeatureCard";
import { FeatureListItem } from "./FeatureListItem";
import { SectionHeading } from "./SectionHeading";

const FEATURED = LANDING_FEATURES.filter((feature) => feature.preview);
const REST = LANDING_FEATURES.filter((feature) => !feature.preview);

export function FeaturesSection() {
  return (
    <section
      id="herramientas"
      aria-labelledby="herramientas-title"
      className="scroll-mt-16 border-t border-border py-24 sm:py-32"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading
          id="herramientas-title"
          eyebrow="Herramientas"
          title="Un cuaderno por tema, nueve formas de estudiarlo"
          description="Tus documentos se convierten en chat, evaluaciones y material de repaso."
        />

        <ul className="mt-16 grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          {FEATURED.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </ul>

        <ul className="mt-16 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {REST.map((feature) => (
            <FeatureListItem key={feature.title} feature={feature} />
          ))}
        </ul>
      </div>
    </section>
  );
}
