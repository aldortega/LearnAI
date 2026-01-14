import { cn } from "../lib/cn";

type Tab<T extends string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  tabs: Array<Tab<T>>;
  className?: string;
};

export function Tabs<T extends string>({
  value,
  onChange,
  tabs,
  className,
}: Props<T>) {
  return (
    <div
      className={cn(
        "rounded-full bg-white/60 p-1 ring-1 ring-[color:var(--color-fern-100)]",
        className,
      )}
      role="tablist"
      aria-label="Auth tabs"
    >
      <div className="grid grid-cols-2 gap-1">
        {tabs.map((tab) => {
          const isActive = tab.value === value;

          return (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(tab.value)}
              className={cn(
                "h-10 rounded-full text-sm font-semibold transition",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-green-400)]",
                isActive
                  ? "bg-white text-[color:var(--color-fern-900)] shadow-[0_10px_24px_-20px_rgba(13,32,21,0.45)]"
                  : "text-[color:var(--color-fern-600)] hover:bg-white/70",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
