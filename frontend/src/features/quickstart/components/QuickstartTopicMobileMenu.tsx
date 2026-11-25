import { ArrowDown, ArrowUp, MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { MouseEvent, ReactNode } from "react";

type Props = {
  topicTitle: string;
  isDisabled: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
};

type MenuItem = {
  key: string;
  label: string;
  icon: ReactNode;
  tone: "default" | "danger";
  onSelect: () => void;
};

export function QuickstartTopicMobileMenu({
  topicTitle,
  isDisabled,
  onMoveUp,
  onMoveDown,
  onDelete,
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (menuRef.current && event.target instanceof Node && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  const items: MenuItem[] = [];
  if (onMoveUp) {
    items.push({ key: "up", label: "Mover arriba", icon: <ArrowUp className="h-4 w-4" />, tone: "default", onSelect: onMoveUp });
  }
  if (onMoveDown) {
    items.push({ key: "down", label: "Mover abajo", icon: <ArrowDown className="h-4 w-4" />, tone: "default", onSelect: onMoveDown });
  }
  if (onDelete) {
    items.push({ key: "delete", label: "Eliminar", icon: <Trash2 className="h-4 w-4" />, tone: "danger", onSelect: onDelete });
  }

  if (items.length === 0) return null;

  const handleToggle = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsOpen((prev) => !prev);
  };

  return (
    <div ref={menuRef} className="relative sm:hidden">
      <button
        type="button"
        onClick={handleToggle}
        disabled={isDisabled}
        aria-label={`Opciones de ${topicTitle}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-30"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-44 rounded-lg border border-border bg-surface py-1 shadow-lg"
        >
          {items.map((item) => (
            <button
              key={item.key}
              type="button"
              role="menuitem"
              onClick={(event) => {
                event.stopPropagation();
                setIsOpen(false);
                item.onSelect();
              }}
              className={`flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none ${
                item.tone === "danger" ? "text-error" : "text-muted-foreground"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
