import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function EmptyQuizIllustration(props: Props) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="20" y="22" width="200" height="148" rx="28" className="fill-muted" />
      <rect x="70" y="32" width="100" height="116" rx="12" className="fill-surface stroke-border-strong stroke-2"/>
      <circle cx="120" cy="62" r="17" className="fill-primary"/>
      <path d="M113.5 57.5a6.5 6.5 0 1 1 9 6c-2 1.2-2.5 2.5-2.5 4.5" className="fill-none stroke-primary-foreground stroke-[3]" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="120" cy="74" r="1.8" className="fill-primary-foreground"/>
      <circle cx="88" cy="98" r="6" fill="none" className="stroke-border-strong" strokeWidth="2"/>
      <rect x="102" y="95" width="52" height="6" rx="3" className="fill-border"/>
      <circle cx="88" cy="116" r="6" className="fill-accent"/>
      <path d="M85 116l2.2 2.2L91.5 114" className="fill-none stroke-primary-foreground stroke-[1.8]" strokeLinecap="round" strokeLinejoin="round"/>
      <rect x="102" y="113" width="40" height="6" rx="3" className="fill-border"/>
      <circle cx="88" cy="134" r="6" fill="none" className="stroke-border-strong" strokeWidth="2"/>
      <rect x="102" y="131" width="46" height="6" rx="3" className="fill-border"/>
      <path d="M192 70l2.1 4.9L199 77l-4.9 2.1L192 84l-2.1-4.9L185 77l4.9-2.1Z" className="fill-accent"/>
      <path d="M48 52l1.6 3.4L53 57l-3.4 1.6L48 62l-1.6-3.4L43 57l3.4-1.6Z" className="fill-accent" opacity=".6"/>
      <circle cx="186" cy="124" r="3.5" className="fill-primary" opacity=".25"/>
    </svg>
  );
}
