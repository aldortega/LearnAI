import { useCallback, useEffect, useRef, useState } from "react";

const BASE_CHARS_PER_SECOND = 110;
const CATCH_UP_SECONDS = 1.2;
const WHITESPACE = /\s/;

type SmoothText = {
  text: string;
  whenCaughtUp: (callback: () => void) => void;
  cancel: () => void;
};

function findWordBoundary(target: string, from: number): number {
  for (let i = Math.max(from, 0); i < target.length; i += 1) {
    if (WHITESPACE.test(target[i])) return i;
  }
  return -1;
}

export function useSmoothText(target: string): SmoothText {
  const [revealedLength, setRevealedLength] = useState(0);
  const [lastTargetLength, setLastTargetLength] = useState(target.length);
  const targetRef = useRef(target);
  const shownRef = useRef(0);
  const cursorRef = useRef(0);
  const frameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const caughtUpCallbackRef = useRef<(() => void) | null>(null);

  if (target.length !== lastTargetLength) {
    setLastTargetLength(target.length);
    if (target.length < lastTargetLength) setRevealedLength(0);
  }

  const ensureRunning = useCallback(() => {
    if (frameRef.current !== null) return;
    const step = (time: number) => {
      const current = targetRef.current;
      const lastTime = lastTimeRef.current ?? time;
      const elapsedSeconds = Math.min((time - lastTime) / 1000, 0.1);
      lastTimeRef.current = time;

      const backlog = current.length - shownRef.current;
      if (backlog > 0) {
        const speed = Math.max(BASE_CHARS_PER_SECOND, backlog / CATCH_UP_SECONDS);
        cursorRef.current = Math.max(cursorRef.current, shownRef.current) + speed * elapsedSeconds;
        const boundary = findWordBoundary(current, Math.floor(cursorRef.current));
        const isComplete = caughtUpCallbackRef.current !== null;
        const nextShown = boundary === -1 ? (isComplete ? current.length : shownRef.current) : boundary;
        if (nextShown > shownRef.current) {
          shownRef.current = nextShown;
          setRevealedLength(nextShown);
        }
      }

      if (shownRef.current >= current.length && caughtUpCallbackRef.current) {
        const callback = caughtUpCallbackRef.current;
        caughtUpCallbackRef.current = null;
        callback();
      }

      const shouldContinue =
        shownRef.current < targetRef.current.length || caughtUpCallbackRef.current !== null;
      if (shouldContinue) {
        frameRef.current = requestAnimationFrame(step);
      } else {
        frameRef.current = null;
        lastTimeRef.current = null;
      }
    };
    frameRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    targetRef.current = target;
    if (target.length < shownRef.current) {
      shownRef.current = 0;
      cursorRef.current = 0;
    }
    if (shownRef.current < target.length) ensureRunning();
  }, [ensureRunning, target]);

  useEffect(() => {
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      lastTimeRef.current = null;
    };
  }, []);

  const whenCaughtUp = useCallback(
    (callback: () => void) => {
      caughtUpCallbackRef.current = callback;
      ensureRunning();
    },
    [ensureRunning],
  );

  const cancel = useCallback(() => {
    caughtUpCallbackRef.current = null;
  }, []);

  return {
    text: target.slice(0, Math.min(revealedLength, target.length)),
    whenCaughtUp,
    cancel,
  };
}
