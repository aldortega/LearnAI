import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function EmptyReportsIllustration(props: Props) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="20" y="22" width="200" height="148" rx="28" className="fill-muted" />
      <rect x="72" y="30" width="96" height="120" rx="10" className="fill-surface stroke-border-strong stroke-2"/>
      <rect x="84" y="44" width="44" height="7" rx="3.5" className="fill-primary"/>
      <rect x="84" y="58" width="72" height="4" rx="2" className="fill-border"/>
      <rect x="84" y="66" width="56" height="4" rx="2" className="fill-border" opacity=".6"/>
      <rect x="86" y="92" width="12" height="20" rx="2" className="fill-border"/>
      <rect x="104" y="78" width="12" height="34" rx="2" className="fill-primary"/>
      <rect x="122" y="86" width="12" height="26" rx="2" className="fill-border"/>
      <rect x="140" y="72" width="12" height="40" rx="2" className="fill-accent"/>
      <path d="M84 112.5h72" className="stroke-border-strong" strokeWidth="2" strokeLinecap="round"/>
      <rect x="84" y="122" width="72" height="4" rx="2" className="fill-border"/>
      <rect x="84" y="131" width="44" height="4" rx="2" className="fill-border" opacity=".6"/>
      <circle cx="168" cy="40" r="17" className="fill-accent"/>
      <path d="M168 31l2.7 6.3L177 40l-6.3 2.7L168 49l-2.7-6.3L159 40l6.3-2.7Z" className="fill-accent-foreground"/>
      <path d="M52 78l1.6 3.4L57 83l-3.4 1.6L52 88l-1.6-3.4L47 83l3.4-1.6Z" className="fill-accent" opacity=".6"/>
      <circle cx="190" cy="118" r="3.5" className="fill-primary" opacity=".25"/>
    </svg>
  );
}
