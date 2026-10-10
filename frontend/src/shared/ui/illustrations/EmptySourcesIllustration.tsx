import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function EmptySourcesIllustration(props: Props) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="20" y="22" width="200" height="148" rx="28" className="fill-muted" />
      <rect x="58" y="42" width="84" height="104" rx="8" className="fill-muted stroke-border-strong stroke-2" transform="rotate(-9 100 94)"/>
      <path d="M92 34h46l30 30v74a8 8 0 0 1-8 8H92a8 8 0 0 1-8-8V42a8 8 0 0 1 8-8Z" className="fill-surface stroke-border-strong stroke-2"/>
      <path d="M138 34v22a8 8 0 0 0 8 8h22Z" className="fill-muted stroke-border-strong stroke-2" strokeLinejoin="round"/>
      <rect x="96" y="76" width="44" height="6" rx="3" className="fill-border"/>
      <rect x="96" y="88" width="56" height="6" rx="3" className="fill-border"/>
      <rect x="96" y="100" width="36" height="6" rx="3" className="fill-border" opacity=".6"/>
      <circle cx="164" cy="128" r="22" className="fill-primary"/>
      <path d="M164 138v-20M155 126l9-9 9 9" className="fill-none stroke-primary-foreground stroke-[3]" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M56 56l2.1 4.9L63 63l-4.9 2.1L56 70l-2.1-4.9L49 63l4.9-2.1Z" className="fill-accent"/>
      <path d="M190 62l1.6 3.4L195 67l-3.4 1.6L190 72l-1.6-3.4L185 67l3.4-1.6Z" className="fill-accent" opacity=".6"/>
      <circle cx="52" cy="124" r="3.5" className="fill-primary" opacity=".25"/>
    </svg>
  );
}
