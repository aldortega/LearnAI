import { MoreVertical, Pencil, Share2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getEmojiBackgroundClass } from "../../notebooks/utils/emojiColors";

const DEFAULT_NOTEBOOK_EMOJI = "📓";

type Props = {
  id: string;
  title: string;
  sourceCount: number;
  updatedAt: string;
  emoji?: string | null;
  onEdit: () => void;
  onDelete: () => void;
  onInvite?: () => void;
};

export function NotebookListItem({
  id,
  title,
  sourceCount,
  updatedAt,
  emoji,
  onEdit,
  onDelete,
  onInvite,
}: Props) {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNavigate = () => {
    navigate(`/notebook/${id}/quickstart`);
  };

  const sourcesLabel =
    sourceCount === 0
      ? "0 fuentes"
      : sourceCount === 1
        ? "1 fuente"
        : `${sourceCount} fuentes`;

  const noSourcesHint =
    sourceCount === 0 ? " · Agrega tu primera fuente" : "";

  return (
    <div
      onClick={handleNavigate}
      className="group flex cursor-pointer items-center gap-4 rounded-lg px-4 py-3.5 transition-colors hover:bg-muted/60"
    >
      {/* Emoji avatar */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${getEmojiBackgroundClass(
          emoji,
        )}`}
      >
        <span className="text-lg" aria-hidden>
          {emoji ?? DEFAULT_NOTEBOOK_EMOJI}
        </span>
      </div>

      {/* Text content */}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-semibold leading-tight text-foreground group-hover:text-primary">
          {title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {sourcesLabel} · {updatedAt}
          {noSourcesHint}
        </p>
      </div>

      {/* Menu button */}
      <div className="relative shrink-0" ref={menuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen((prev) => !prev);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Opciones del cuaderno"
          aria-expanded={isMenuOpen}
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {isMenuOpen ? (
          <div className="absolute right-0 z-20 mt-2 w-44 origin-top-right rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-black/5">
            {onInvite ? (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  setIsMenuOpen(false);
                  onInvite();
                }}
                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                <Share2 className="h-4 w-4" />
                Invitar
              </button>
            ) : null}
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsMenuOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
            >
              <Pencil className="h-4 w-4" />
              Editar
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsMenuOpen(false);
                onDelete();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-error hover:bg-muted"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
