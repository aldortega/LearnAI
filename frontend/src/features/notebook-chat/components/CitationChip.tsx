import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { createPortal } from "react-dom";

import type { ChatSource } from "../types/chat.types";
import { cleanSnippet } from "../utils/citations";

type Props = {
  label: number;
  source: ChatSource | null;
};

const POPOVER_WIDTH = 320;
const POPOVER_MAX_HEIGHT = 320;
const VIEWPORT_MARGIN = 8;
const CLOSE_DELAY_MS = 150;

function computePopoverStyle(anchor: DOMRect): CSSProperties {
  const width = Math.min(POPOVER_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
  const left = Math.min(
    Math.max(anchor.left, VIEWPORT_MARGIN),
    window.innerWidth - width - VIEWPORT_MARGIN,
  );
  const spaceBelow = window.innerHeight - anchor.bottom - VIEWPORT_MARGIN * 2;
  const spaceAbove = anchor.top - VIEWPORT_MARGIN * 2;
  const placeBelow = spaceBelow >= POPOVER_MAX_HEIGHT || spaceBelow >= spaceAbove;
  const maxHeight = Math.min(
    POPOVER_MAX_HEIGHT,
    Math.max(placeBelow ? spaceBelow : spaceAbove, 120),
  );
  return placeBelow
    ? { left, width, maxHeight, top: anchor.bottom + VIEWPORT_MARGIN }
    : {
        left,
        width,
        maxHeight,
        bottom: window.innerHeight - anchor.top + VIEWPORT_MARGIN,
      };
}

export function CitationChip({ label, source }: Props) {
  const [popoverStyle, setPopoverStyle] = useState<CSSProperties | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);
  const popoverId = useId();
  const isOpen = popoverStyle !== null;

  const cancelClose = useCallback(() => {
    if (closeTimerRef.current === null) return;
    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, []);

  const close = useCallback(() => {
    cancelClose();
    setPopoverStyle(null);
  }, [cancelClose]);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimerRef.current = window.setTimeout(close, CLOSE_DELAY_MS);
  }, [cancelClose, close]);

  const open = useCallback(() => {
    cancelClose();
    if (!buttonRef.current) return;
    setPopoverStyle(computePopoverStyle(buttonRef.current.getBoundingClientRect()));
  }, [cancelClose]);

  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleScroll = (event: Event) => {
      if (popoverRef.current?.contains(event.target as Node)) return;
      close();
    };
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", close);
    };
  }, [isOpen, close]);

  if (!source) {
    return (
      <span className="mx-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 align-middle text-[11px] font-medium text-primary">
        {label}
      </span>
    );
  }

  return (
    <span
      className="mx-0.5 inline-block align-middle"
      onMouseEnter={open}
      onMouseLeave={scheduleClose}
    >
      <button
        ref={buttonRef}
        type="button"
        className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-expanded={isOpen}
        aria-describedby={isOpen ? popoverId : undefined}
        aria-label={`Fuente ${label}: ${source.file_name}`}
        onClick={isOpen ? close : open}
        onFocus={open}
        onBlur={scheduleClose}
      >
        {label}
      </button>
      {popoverStyle
        ? createPortal(
            <div
              ref={popoverRef}
              id={popoverId}
              role="tooltip"
              style={popoverStyle}
              onMouseEnter={cancelClose}
              onMouseLeave={scheduleClose}
              className="fixed z-[1000] flex flex-col rounded-xl border border-border bg-surface p-3 text-left text-xs font-normal leading-relaxed text-foreground shadow-xl"
            >
              <p className="shrink-0 break-words text-sm font-semibold leading-snug">{source.file_name}</p>
              {source.page ? (
                <p className="mt-0.5 shrink-0 text-muted-foreground">Página {source.page}</p>
              ) : null}
              {source.snippet ? (
                <p className="mt-2 min-h-0 flex-1 overflow-y-auto whitespace-pre-line pr-1 text-muted-foreground">
                  {cleanSnippet(source.snippet)}
                </p>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
