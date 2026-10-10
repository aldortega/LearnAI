import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function EmptyPresentationsIllustration(props: Props) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="20" y="22" width="200" height="148" rx="28" className="fill-muted" />
      <rect x="44" y="40" width="152" height="92" rx="10" className="fill-surface stroke-border-strong stroke-2" />
      <rect x="116" y="132" width="8" height="16" className="fill-border" />
      <rect x="94" y="146" width="52" height="6" rx="3" className="fill-border" />
      <rect x="60" y="56" width="60" height="8" rx="4" className="fill-primary" />
      <rect x="60" y="72" width="52" height="5" rx="2.5" className="fill-border" />
      <rect x="60" y="83" width="38" height="5" rx="2.5" className="fill-border" opacity=".6" />
      <rect x="130" y="68" width="52" height="48" rx="6" className="fill-muted" />
      <rect x="138" y="94" width="8" height="16" rx="2" className="fill-border" />
      <rect x="152" y="84" width="8" height="26" rx="2" className="fill-primary" />
      <rect x="166" y="76" width="8" height="34" rx="2" className="fill-accent" />
      <circle cx="188" cy="124" r="18" className="fill-accent" />
      <path d="M183 115.5L197 124l-14 8.5Z" className="fill-accent-foreground" />
      <path d="M46 28l1.6 3.4L51 33l-3.4 1.6L46 38l-1.6-3.4L41 33l3.4-1.6Z" className="fill-accent" opacity=".6" />
      <circle cx="202" cy="48" r="3.5" className="fill-primary" opacity=".25" />
    </svg>
  );
}
