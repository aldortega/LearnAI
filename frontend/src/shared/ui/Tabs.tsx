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
        "rounded-lg bg-zinc-100 p-1",
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
                "h-9 rounded-md text-sm font-medium transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-fern-500)]",
                isActive
                  ? "bg-white text-zinc-900 shadow-sm ring-1 ring-black/5"
                  : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-700",
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
