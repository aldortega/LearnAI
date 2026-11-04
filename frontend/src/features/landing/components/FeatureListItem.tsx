import type { LandingFeature } from "../utils/landingContent";

type Props = {
  feature: LandingFeature;
};

export function FeatureListItem({ feature }: Props) {
  const { icon: Icon, title, description } = feature;

  return (
    <li className="flex gap-3">
      <Icon aria-hidden className="mt-0.5 size-4.5 shrink-0 text-primary" strokeWidth={1.5} />
      <div>
        <h3 className="text-sm font-medium text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </li>
  );
}
