import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function EmptyChatIllustration(props: Props) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="20" y="22" width="200" height="148" rx="28" className="fill-muted" />
      <path d="M68 44h76a16 16 0 0 1 16 16v24a16 16 0 0 1-16 16H84l-18 18 2-18a16 16 0 0 1-16-16V60a16 16 0 0 1 16-16Z" className="fill-surface stroke-border-strong stroke-2" strokeLinejoin="round"/>
      <circle cx="84" cy="72" r="5" className="fill-primary"/>
      <circle cx="106" cy="72" r="5" className="fill-primary" opacity=".6"/>
      <circle cx="128" cy="72" r="5" className="fill-primary" opacity=".3"/>
      <path d="M126 112h48a14 14 0 0 1 14 14v6a14 14 0 0 1-14 14h-48a14 14 0 0 1-14-14v-6a14 14 0 0 1 14-14Z" className="fill-primary"/>
      <rect x="124" y="123" width="44" height="5" rx="2.5" className="fill-primary-foreground" opacity=".9"/>
      <rect x="124" y="133" width="26" height="5" rx="2.5" className="fill-primary-foreground" opacity=".6"/>
      <path d="M192 52l2.1 4.9L199 59l-4.9 2.1L192 66l-2.1-4.9L185 59l4.9-2.1Z" className="fill-accent"/>
      <path d="M46 112l1.6 3.4L51 117l-3.4 1.6L46 122l-1.6-3.4L41 117l3.4-1.6Z" className="fill-accent" opacity=".6"/>
    </svg>
  );
}
