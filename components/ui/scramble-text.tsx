"use client";

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#%&*+=<>/";

type ScrambleTextProps = {
  text: string;
  /** Milliseconds for the whole decode. */
  duration?: number;
  className?: string;
};

/** Text that decodes from random glyphs, left to right, on hover or focus. */
export function ScrambleText({ text, duration = 700, className = "" }: ScrambleTextProps) {
  const [shown, setShown] = useState(text);
  const frame = useRef<number | null>(null);
  const reduce = useReducedMotion();

  const run = useCallback(() => {
    if (reduce) return;
    if (frame.current) cancelAnimationFrame(frame.current);
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const settled = Math.floor(t * text.length);
      setShown(
        text
          .split("")
          .map((ch, i) =>
            ch === " " || i < settled ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join(""),
      );
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, [text, duration, reduce]);

  useEffect(() => () => {
    if (frame.current) cancelAnimationFrame(frame.current);
  }, []);

  return (
    <span className={className} onPointerEnter={run} onFocus={run} tabIndex={0} aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
}
