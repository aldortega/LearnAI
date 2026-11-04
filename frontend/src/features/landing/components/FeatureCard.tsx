import type { LandingFeature } from "../utils/landingContent";
import { FlashcardPreview } from "./FlashcardPreview";
import { QuizPreview } from "./QuizPreview";

type Props = {
  feature: LandingFeature;
};

export function FeatureCard({ feature }: Props) {
  const { icon: Icon, title, description, preview } = feature;

  return (
    <li className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-6">
      <div>
        <div className="flex items-center gap-2.5">
          <Icon aria-hidden className="size-4.5 text-primary" strokeWidth={1.5} />
          <h3 className="text-base font-medium text-foreground">{title}</h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {preview === "quiz" ? <QuizPreview /> : null}
      {preview === "flashcard" ? <FlashcardPreview /> : null}
    </li>
  );
}
