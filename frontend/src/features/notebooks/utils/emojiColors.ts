const DEFAULT_EMOJI_BG_CLASS =
  "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200";

const EMOJI_BG_CLASSES: Record<string, string> = {
  "📓": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
  "📚": "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100",
  "📖": "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
  "📝": "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-100",
  "🧠": "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-100",
  "💡": "bg-yellow-100 text-yellow-800 dark:bg-yellow-500/20 dark:text-yellow-100",
  "🔬": "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-100",
  "🧪": "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-100",
  "🧬": "bg-lime-100 text-lime-800 dark:bg-lime-500/20 dark:text-lime-100",
  "🧮": "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-100",
  "📊": "bg-blue-100 text-blue-800 dark:bg-blue-500/20 dark:text-blue-100",
  "💻": "bg-slate-100 text-slate-800 dark:bg-slate-700/40 dark:text-slate-100",
  "🛰️": "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100",
  "🌍": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
  "⚖️": "bg-stone-100 text-stone-800 dark:bg-stone-700/40 dark:text-stone-100",
  "🎨": "bg-pink-100 text-pink-800 dark:bg-pink-500/20 dark:text-pink-100",
  "🎵": "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/20 dark:text-fuchsia-100",
  "🧩": "bg-violet-100 text-violet-800 dark:bg-violet-500/20 dark:text-violet-100",
  "🧭": "bg-teal-100 text-teal-800 dark:bg-teal-500/20 dark:text-teal-100",
  "🧫": "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-100",
  "🔭": "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-100",
  "📌": "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-100",
  "🏛️": "bg-stone-100 text-stone-800 dark:bg-stone-700/40 dark:text-stone-100",
  "📈": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
  "📒": "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
  "📕": "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-100",
  "📗": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
  "📘": "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100",
  "📙": "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-100",
  "🗂️": "bg-slate-100 text-slate-800 dark:bg-slate-700/40 dark:text-slate-100",
  "🗒️": "bg-zinc-100 text-zinc-800 dark:bg-zinc-700/40 dark:text-zinc-100",
  "✏️": "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
  "📐": "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-100",
  "📏": "bg-cyan-100 text-cyan-800 dark:bg-cyan-500/20 dark:text-cyan-100",
  "🧾": "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-100",
  "🗃️": "bg-slate-100 text-slate-800 dark:bg-slate-700/40 dark:text-slate-100",
  "🔎": "bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-100",
  "🗺️": "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-100",
  "🧵": "bg-orange-100 text-orange-800 dark:bg-orange-500/20 dark:text-orange-100",
  "🪐": "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/20 dark:text-indigo-100",
  "🔋": "bg-lime-100 text-lime-800 dark:bg-lime-500/20 dark:text-lime-100",
  "🧯": "bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-100",
};

export function normalizeEmoji(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    for (const { segment } of segmenter.segment(trimmed)) {
      return segment;
    }
  }

  return Array.from(trimmed)[0] ?? "";
}

export function getEmojiBackgroundClass(emoji?: string | null): string {
  if (!emoji) return DEFAULT_EMOJI_BG_CLASS;
  const normalized = normalizeEmoji(emoji);
  if (!normalized) return DEFAULT_EMOJI_BG_CLASS;
  return EMOJI_BG_CLASSES[normalized] ?? DEFAULT_EMOJI_BG_CLASS;
}
