import { cn } from "../../../shared/lib/cn";
import { Spinner } from "../../../shared/ui/Spinner";
import type { StudioModeItem } from "../hooks/useStudioModeItems";
import { useStudioRailIndicator } from "../hooks/useStudioRailIndicator";
import { StudioReadyDot } from "./StudioReadyDot";

type Props = {
  items: StudioModeItem[];
};

export function StudioRail({ items }: Props) {
  const activeMode = items.find((item) => item.isActive)?.key ?? null;
  const { displayIndex, indicatorOffsetPx, didSwitch } = useStudioRailIndicator(
    items.map((item) => item.key),
    activeMode,
  );

  return (
    <nav
      aria-label="Modos de estudio"
      className="relative hidden h-full w-16 flex-none flex-col items-center gap-1 border-r border-border bg-muted py-3 md:flex"
    >
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-3 top-3 h-10 w-10 rounded-xl bg-primary shadow-sm",
          "transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          displayIndex === -1 && "opacity-0",
        )}
        style={{ transform: `translateY(${indicatorOffsetPx}px)` }}
      />
      {items.map((item, index) => {
        const isDisplayedActive = index === displayIndex;
        return (
          <div key={item.key} className="group relative flex-none">
            <button
              type="button"
              onClick={item.onClick}
              disabled={item.isDisabled}
              aria-label={item.hint}
              aria-current={item.isActive ? "page" : undefined}
              className={cn(
                "relative grid h-10 w-10 place-items-center rounded-xl transition-[color,background-color,scale] duration-300 motion-safe:active:scale-90",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-muted",
                isDisplayedActive
                  ? "text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted-hover hover:text-foreground",
                !item.isDisabled && "cursor-pointer",
                item.isDisabled && !item.isLoading && "cursor-not-allowed opacity-50",
                item.isLoading && "cursor-progress",
              )}
            >
              {item.isLoading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <item.icon
                  key={item.isReady ? "ready" : isDisplayedActive ? "active" : "idle"}
                  className={cn(
                    "h-5 w-5",
                    item.isReady && "text-primary animate-celebrate motion-reduce:animate-none",
                    isDisplayedActive && didSwitch && "animate-icon-select motion-reduce:animate-none",
                  )}
                />
              )}
              {item.isReady ? <StudioReadyDot /> : null}
            </button>
            <span
              role="tooltip"
              className={cn(
                "pointer-events-none absolute left-full top-1/2 z-30 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-surface opacity-0 shadow-md transition-opacity",
                "group-hover:opacity-100 group-has-[:focus-visible]:opacity-100",
              )}
            >
              {item.hint}
            </span>
          </div>
        );
      })}
    </nav>
  );
}
