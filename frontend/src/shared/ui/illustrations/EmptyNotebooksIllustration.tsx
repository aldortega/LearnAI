import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function EmptyNotebooksIllustration(props: Props) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="20" y="22" width="200" height="148" rx="28" className="fill-muted" />
      <rect x="76" y="34" width="88" height="112" rx="10" className="fill-surface stroke-border-strong stroke-2"/>
      <path d="M86 34h6v112h-6a10 10 0 0 1-10-10V44a10 10 0 0 1 10-10Z" className="fill-primary"/>
      <rect x="106" y="52" width="44" height="6" rx="3" className="fill-border"/>
      <rect x="106" y="64" width="30" height="6" rx="3" className="fill-border" opacity=".6"/>
      <circle cx="130" cy="104" r="20" className="fill-muted"/>
      <circle cx="130" cy="104" r="20" fill="none" className="stroke-primary" strokeWidth="2" strokeDasharray="4 4"/>
      <path d="M130 95v18M121 104h18" className="fill-none stroke-primary stroke-[2.5]" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M190 43l2.1 4.9L197 50l-4.9 2.1L190 57l-2.1-4.9L183 50l4.9-2.1Z" className="fill-accent"/>
      <path d="M50 69l2.1 4.9L57 76l-4.9 2.1L50 83l-2.1-4.9L43 76l4.9-2.1Z" className="fill-accent" opacity=".6"/>
      <circle cx="178" cy="128" r="4" className="fill-primary" opacity=".25"/>
      <circle cx="58" cy="120" r="3" className="fill-accent" opacity=".3"/>
    </svg>
  );
}
