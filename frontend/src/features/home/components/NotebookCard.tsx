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
      className="group relative flex h-48 cursor-pointer flex-col justify-between rounded-xl border border-zinc-200 bg-white p-5 transition-shadow hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="absolute right-3 top-3" ref={menuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setIsMenuOpen((prev) => !prev);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-300 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 dark:focus-visible:ring-green-500"
          aria-label="Opciones del notebook"
          aria-expanded={isMenuOpen}
        >
          <MoreVertical className="h-4 w-4" />
        </button>

        {isMenuOpen ? (
          <div className="absolute right-0 mt-2 w-40 origin-top-right rounded-lg border border-zinc-100 bg-white py-1 shadow-lg ring-1 ring-black/5 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsMenuOpen(false);
                onEdit();
              }}
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 dark:text-zinc-200 dark:hover:bg-zinc-800/60"
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
              className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-zinc-50 dark:text-red-400 dark:hover:bg-zinc-800/60"
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
        <h3 className="line-clamp-2 text-lg font-semibold leading-tight text-zinc-900 group-hover:text-green-700 dark:text-zinc-100 dark:group-hover:text-green-300">
          {title}
        </h3>
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
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
