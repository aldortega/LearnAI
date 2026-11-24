// PROTOTYPE — selector flotante de variantes (solo en desarrollo).
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect } from "react";

type Props = {
  variants: { key: string; name: string }[];
  current: string;
  onChange: (key: string) => void;
};

export function PrototypeSwitcher({ variants, current, onChange }: Props) {
  const index = Math.max(0, variants.findIndex((v) => v.key === current));
  const cycle = (delta: number) => onChange(variants[(index + delta + variants.length) % variants.length].key);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable]")) return;
      if (e.key === "ArrowLeft") onChange(variants[(index - 1 + variants.length) % variants.length].key);
      if (e.key === "ArrowRight") onChange(variants[(index + 1) % variants.length].key);
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, variants, onChange]);

  if (!import.meta.env.DEV) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-[2000] flex -translate-x-1/2 items-center gap-1 rounded-full bg-black px-2 py-1.5 text-white shadow-2xl ring-2 ring-fuchsia-500">
      <button type="button" onClick={() => cycle(-1)} aria-label="Variante anterior" className="cursor-pointer rounded-full p-1 hover:bg-white/20"><ChevronLeft className="h-4 w-4" /></button>
      <span className="px-2 text-xs font-semibold">{variants[index].key} ({variants[index].name})</span>
      <button type="button" onClick={() => cycle(1)} aria-label="Variante siguiente" className="cursor-pointer rounded-full p-1 hover:bg-white/20"><ChevronRight className="h-4 w-4" /></button>
    </div>
  );
}
