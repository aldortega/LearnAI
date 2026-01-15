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
        "rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900",
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
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500",
                isActive
                  ? "bg-white text-zinc-900 shadow-sm ring-1 ring-black/5 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-700"
                  : "text-zinc-500 hover:bg-zinc-200/50 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/70 dark:hover:text-zinc-200",
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
