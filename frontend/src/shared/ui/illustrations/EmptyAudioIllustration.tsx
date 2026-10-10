import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement>;

export function EmptyAudioIllustration(props: Props) {
  return (
    <svg
      viewBox="0 0 240 180"
      fill="none"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <rect x="20" y="22" width="200" height="148" rx="28" className="fill-muted" />
      <rect x="48" y="65" width="6" height="18" rx="3" className="fill-border" />
      <rect x="62" y="57" width="6" height="34" rx="3" className="fill-accent" />
      <rect x="76" y="63" width="6" height="22" rx="3" className="fill-border" />
      <rect x="158" y="63" width="6" height="22" rx="3" className="fill-border" />
      <rect x="172" y="57" width="6" height="34" rx="3" className="fill-accent" />
      <rect x="186" y="65" width="6" height="18" rx="3" className="fill-border" />
      <path d="M92 78v6a28 28 0 0 0 56 0v-6M120 112v22M104 136h32" className="fill-none stroke-primary stroke-[3]" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="104" y="36" width="32" height="62" rx="16" className="fill-primary" />
      <rect x="112" y="52" width="16" height="3" rx="1.5" className="fill-primary-foreground" opacity=".6" />
      <rect x="112" y="62" width="16" height="3" rx="1.5" className="fill-primary-foreground" opacity=".6" />
      <rect x="112" y="72" width="16" height="3" rx="1.5" className="fill-primary-foreground" opacity=".6" />
      <path d="M196 38l2.1 4.9L203 45l-4.9 2.1L196 52l-2.1-4.9L189 45l4.9-2.1Z" className="fill-accent" />
      <circle cx="44" cy="120" r="3.5" className="fill-primary" opacity=".25" />
    </svg>
  );
}
