import { useEffect } from "react";
import { createPortal } from "react-dom";

import { cn } from "../../../shared/lib/cn";
import { Spinner } from "../../../shared/ui/Spinner";
import type { StudioModeItem } from "../hooks/useStudioModeItems";
import { StudioReadyDot } from "./StudioReadyDot";

type Props = {
  isOpen: boolean;
  items: StudioModeItem[];
  onClose: () => void;
};

export function ModeSwitcherSheet({ isOpen, items, onClose }: Props) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelect = (item: StudioModeItem) => {
    if (item.isDisabled) return;
    onClose();
    if (!item.isActive) item.onClick();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:hidden">
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mode-switcher-title"
        className="relative w-full rounded-t-2xl bg-surface px-4 pt-2 pb-5 shadow-xl ring-1 ring-border animate-fade-up"
      >
        <div className="mx-auto mb-3 h-1 w-9 rounded-full bg-muted-hover" aria-hidden="true" />
        <h2 id="mode-switcher-title" className="mb-3 text-sm font-semibold text-muted-foreground">
          Modos de estudio
        </h2>
        <ul className="grid grid-cols-3 gap-2">
          {items.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => handleSelect(item)}
                disabled={item.isDisabled}
                aria-label={item.hint}
                aria-current={item.isActive ? "page" : undefined}
                className={cn(
                  "relative flex h-full w-full flex-col items-center gap-1.5 rounded-xl border px-1 py-3 text-center text-xs font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                  item.isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-foreground hover:bg-muted",
                  !item.isDisabled && "cursor-pointer",
                  item.isDisabled && !item.isLoading && "cursor-not-allowed opacity-50",
                  item.isLoading && "cursor-progress",
                )}
              >
                {item.isLoading ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <item.icon
                    className={cn("h-5 w-5", !item.isActive && "text-primary")}
                    aria-hidden="true"
                  />
                )}
                <span>{item.label}</span>
                {item.isReady ? <StudioReadyDot /> : null}
                {item.isLoading ? (
                  <span className="text-[11px] font-normal text-muted-foreground">Generando…</span>
                ) : item.isReady ? (
                  <span className="text-[11px] font-semibold text-primary">Listo</span>
                ) : item.needsSource ? (
                  <span className="text-[11px] font-normal text-muted-foreground">Sin fuentes</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body,
  );
}
