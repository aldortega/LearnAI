import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function EmptyMindmapIllustration(props: Props) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="20" y="22" width="200" height="148" rx="28" className="fill-muted" />
      <path d="M120 92L62 55M120 92L178 55M120 92L61 131M120 92L179 131" className="fill-none stroke-border-strong stroke-2" strokeLinecap="round" />
      <rect x="36" y="42" width="52" height="26" rx="13" className="fill-surface stroke-border-strong stroke-2" />
      <rect x="152" y="42" width="52" height="26" rx="13" className="fill-surface stroke-border-strong stroke-2" />
      <rect x="34" y="118" width="54" height="26" rx="13" className="fill-surface stroke-border-strong stroke-2" />
      <rect x="152" y="118" width="54" height="26" rx="13" className="fill-surface stroke-border-strong stroke-2" />
      <rect x="48" y="52.5" width="28" height="5" rx="2.5" className="fill-border" />
      <rect x="164" y="52.5" width="28" height="5" rx="2.5" className="fill-accent" />
      <rect x="47" y="128.5" width="28" height="5" rx="2.5" className="fill-accent" />
      <rect x="165" y="128.5" width="28" height="5" rx="2.5" className="fill-border" />
      <circle cx="120" cy="92" r="24" className="fill-primary" />
      <path d="M120 80l3.6 8.4L132 92l-8.4 3.6L120 104l-3.6-8.4L108 92l8.4-3.6Z" className="fill-primary-foreground" />
      <path d="M120 26l1.6 3.4L125 31l-3.4 1.6L120 36l-1.6-3.4L115 31l3.4-1.6Z" className="fill-accent" />
      <circle cx="120" cy="152" r="3.5" className="fill-primary" opacity=".25" />
    </svg>
  );
}
