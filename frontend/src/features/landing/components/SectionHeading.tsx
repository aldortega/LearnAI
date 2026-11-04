type Props = {
  eyebrow: string;
  title: string;
  description?: string;
  id?: string;
};

export function SectionHeading({ eyebrow, title, description, id }: Props) {
  return (
    <div className="max-w-2xl">
      <p className="text-sm font-medium text-primary">{eyebrow}</p>
      <h2
        id={id}
        className="mt-3 text-3xl font-medium tracking-tight text-balance text-foreground sm:text-4xl"
      >
        {title}
      </h2>
      {description ? (
        <p className="mt-4 text-lg leading-8 text-pretty text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
