import { cn } from "../../../shared/lib/cn";

type Props = {
  total: number;
  current: number;
  onSelect: (index: number) => void;
};

export function OnboardingStepDots({ total, current, onSelect }: Props) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="Pasos del tutorial">
      {Array.from({ length: total }, (_, i) => (
        <button
          key={i}
          type="button"
          aria-current={i === current ? "step" : undefined}
          aria-label={`Ir al paso ${i + 1} de ${total}`}
          onClick={() => onSelect(i)}
          className={cn(
            "h-2 cursor-pointer rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
            i === current ? "w-6 bg-primary" : "w-2 bg-border hover:bg-border-strong",
          )}
        />
      ))}
    </div>
  );
}
