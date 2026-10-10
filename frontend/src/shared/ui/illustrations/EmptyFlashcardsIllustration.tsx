import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function EmptyFlashcardsIllustration(props: Props) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="20" y="22" width="200" height="148" rx="28" className="fill-muted" />
      <rect x="66" y="50" width="108" height="72" rx="10" className="fill-accent" opacity=".25" transform="rotate(10 120 86)"/>
      <rect x="66" y="50" width="108" height="72" rx="10" className="fill-muted stroke-border-strong stroke-2" transform="rotate(-5 120 86)"/>
      <rect x="66" y="56" width="108" height="76" rx="10" className="fill-surface stroke-border-strong stroke-2"/>
      <rect x="84" y="76" width="50" height="7" rx="3.5" className="fill-primary"/>
      <rect x="84" y="90" width="72" height="5" rx="2.5" className="fill-border"/>
      <rect x="84" y="101" width="40" height="5" rx="2.5" className="fill-border" opacity=".6"/>
      <path d="M160 118a9 9 0 1 1-2.6-6.4M159 106v6h-6" className="fill-none stroke-primary stroke-2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M190 52l2.1 4.9L197 59l-4.9 2.1L190 66l-2.1-4.9L183 59l4.9-2.1Z" className="fill-accent"/>
      <path d="M48 98l1.6 3.4L53 103l-3.4 1.6L48 108l-1.6-3.4L43 103l3.4-1.6Z" className="fill-accent" opacity=".6"/>
      <circle cx="190" cy="134" r="3.5" className="fill-primary" opacity=".25"/>
    </svg>
  );
}
