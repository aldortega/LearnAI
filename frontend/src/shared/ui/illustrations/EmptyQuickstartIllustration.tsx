import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function EmptyQuickstartIllustration(props: Props) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="20" y="22" width="200" height="148" rx="28" className="fill-muted" />
      <rect x="66" y="36" width="108" height="108" rx="12" className="fill-surface stroke-border-strong stroke-2" />
      <circle cx="120" cy="60" r="16" className="fill-primary" />
      <path d="M120 51l2.7 6.3L129 60l-6.3 2.7L120 69l-2.7-6.3L111 60l6.3-2.7Z" className="fill-primary-foreground" />
      <rect x="84" y="86" width="72" height="5" rx="2.5" className="fill-border" />
      <rect x="84" y="96" width="56" height="5" rx="2.5" className="fill-border" opacity=".6" />
      <rect x="82" y="114" width="30" height="16" rx="8" className="fill-primary" />
      <rect x="118" y="114" width="40" height="16" rx="8" className="fill-accent" opacity=".35" />
      <path d="M196 56l2.1 4.9L203 63l-4.9 2.1L196 70l-2.1-4.9L189 63l4.9-2.1Z" className="fill-accent" />
      <path d="M46 108l1.6 3.4L51 113l-3.4 1.6L46 118l-1.6-3.4L41 113l3.4-1.6Z" className="fill-accent" opacity=".6" />
      <circle cx="190" cy="124" r="3.5" className="fill-primary" opacity=".25" />
    </svg>
  );
}
