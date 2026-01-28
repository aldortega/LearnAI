import { useId, useMemo, useState } from "react";

const EMOJI_OPTIONS = [
  "📓",
  "📚",
  "📖",
  "📝",
  "🧠",
  "💡",
  "🔬",
  "🧪",
  "🧬",
  "🧮",
  "📊",
  "💻",
  "🛰️",
  "🌍",
  "⚖️",
  "🎨",
  "🎵",
  "🧩",
  "🧭",
  "🧫",
  "🔭",
  "📌",
  "🏛️",
  "📈",
 ];

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
};

function normalizeEmoji(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  return Array.from(trimmed)[0] ?? "";
}

export function EmojiPicker({ label, value, onChange, helperText }: Props) {
  const id = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  const currentEmoji = useMemo(() => normalizeEmoji(value), [value]);

  const handleSelect = (emoji: string) => {
    onChange(emoji);
    setIsOpen(false);
  };

  const handleCustomChange = (nextValue: string) => {
    setCustomValue(nextValue);
    const normalized = normalizeEmoji(nextValue);
    if (normalized) {
      onChange(normalized);
    }
  };

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
      >
        {label}
      </label>

      <div className="relative">
        <div className="flex items-center gap-3">
          <button
            id={id}
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="flex h-10 w-12 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xl transition hover:border-emerald-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
            aria-label="Elegir emoji"
          >
            {currentEmoji || "📓"}
          </button>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 transition hover:border-emerald-400 hover:text-emerald-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:border-zinc-800 dark:text-zinc-200"
          >
            {isOpen ? "Cerrar" : "Cambiar"}
          </button>
        </div>

        {helperText ? (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            {helperText}
          </p>
        ) : null}

        {isOpen ? (
          <div
            role="dialog"
            className="absolute bottom-full left-0 z-10 mb-3 flex max-h-80 w-72 flex-col overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div className="max-h-56 overflow-y-auto overscroll-contain touch-pan-y p-3">
              <div className="grid grid-cols-8 gap-2">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleSelect(emoji)}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-lg transition hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 dark:hover:bg-emerald-500/10"
                    aria-label={`Seleccionar ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-none border-t border-zinc-200 p-3 dark:border-zinc-800">
              <label
                htmlFor={`${id}-custom`}
                className="block text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                Pegar emoji
              </label>
              <input
                id={`${id}-custom`}
                type="text"
                value={customValue}
                onChange={(event) => handleCustomChange(event.target.value)}
                placeholder="Ej: 🧠"
                className="mt-1 h-9 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 transition focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
