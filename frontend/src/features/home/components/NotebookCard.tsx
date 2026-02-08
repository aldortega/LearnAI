import { Clock, MoreVertical, Pencil, Trash2 } from "lucide-react";
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
};

export function NotebookCard({
  id,
  title,
  sourceCount,
  updatedAt,
  emoji,
  onEdit,
  onDelete,
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

  return (
    <div
      onClick={handleNavigate}
      className="group relative flex h-48 cursor-pointer flex-col justify-between rounded-xl border border-border bg-surface p-5 transition-shadow hover:shadow-md"
    >
      <div className="absolute right-3 top-3" ref={menuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen((prev) => !prev);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Opciones del notebook"
          aria-expanded={isMenuOpen}
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {isMenuOpen ? (
          <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-lg border border-border bg-surface py-1 shadow-lg ring-1 ring-black/5">
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

      <div>
        <div
          className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full ${getEmojiBackgroundClass(
            emoji,
          )}`}
        >
          <span className="text-xl" aria-hidden>
            {emoji ?? DEFAULT_NOTEBOOK_EMOJI}
          </span>
        </div>
        <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-foreground group-hover:text-primary">
          {title}
        </h3>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          {sourceCount} {sourceCount === 1 ? "fuente" : "fuentes"}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {updatedAt}
        </span>
      </div>
    </div>
  );
}

