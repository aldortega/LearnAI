import type { MouseEvent } from "react";

export function scrollToSection(event: MouseEvent<HTMLAnchorElement>): void {
  const sectionId = event.currentTarget.hash.slice(1);
  const section = sectionId ? document.getElementById(sectionId) : null;
  if (!section) return;
  event.preventDefault();
  section.scrollIntoView();
}
