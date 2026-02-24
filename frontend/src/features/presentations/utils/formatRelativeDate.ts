const MINUTE = 60;
const HOUR = 3_600;
const DAY = 86_400;
const WEEK = 604_800;
const MONTH = 2_592_000;
const YEAR = 31_536_000;

const rtf = new Intl.RelativeTimeFormat("es", { numeric: "auto" });

export function formatRelativeDate(iso: string): string {
  const seconds = Math.round((Date.now() - new Date(iso).getTime()) / 1_000);

  if (seconds < MINUTE) return "justo ahora";
  if (seconds < HOUR) return rtf.format(-Math.floor(seconds / MINUTE), "minute");
  if (seconds < DAY) return rtf.format(-Math.floor(seconds / HOUR), "hour");
  if (seconds < WEEK) return rtf.format(-Math.floor(seconds / DAY), "day");
  if (seconds < MONTH) return rtf.format(-Math.floor(seconds / WEEK), "week");
  if (seconds < YEAR) return rtf.format(-Math.floor(seconds / MONTH), "month");
  return rtf.format(-Math.floor(seconds / YEAR), "year");
}
