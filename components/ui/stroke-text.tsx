"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

type Direction = "left" | "bottom" | "center";

type StrokeTextProps = {
  text: string;
  /** Where the fill sweeps in from. */
  direction?: Direction;
  /** Outline width in pixels. */
  strokeWidth?: number;
  strokeColor?: string;
  fillColor?: string;
  /** Seconds for the fill to sweep across. */
  duration?: number;
  /** Keep the text filled, for example for the current page in a menu. */
  active?: boolean;
  /** Make the text itself a tab stop. Turn off when it sits inside a link or button. */
  focusable?: boolean;
  className?: string;
};

const EMPTY: Record<Direction, string> = {
  left: "inset(0% 100% 0% 0%)",
  bottom: "inset(100% 0% 0% 0%)",
  center: "circle(0% at 50% 50%)",
};
const FULL: Record<Direction, string> = {
  left: "inset(0% 0% 0% 0%)",
  bottom: "inset(0% 0% 0% 0%)",
  // 72% of the reference radius reaches the corners of any box.
  center: "circle(72% at 50% 50%)",
};

/** Outlined text that fills with color on hover or focus, sweeping in from the left, the bottom or the center. */
export function StrokeText({
  text,
  direction = "left",
  strokeWidth = 1.5,
  strokeColor = "#f4ede3",
  fillColor = "#ff784f",
  duration = 0.5,
  active = false,
  focusable = true,
  className = "",
}: StrokeTextProps) {
  const reduce = useReducedMotion();
  const [engaged, setEngaged] = useState(false);
  const filled = active || engaged;

  return (
    <span
      className={`relative inline-block ${className}`}
      tabIndex={focusable ? 0 : undefined}
      onPointerEnter={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
      onFocus={() => setEngaged(true)}
      onBlur={() => setEngaged(false)}
    >
      <span style={{ color: "transparent", WebkitTextStroke: `${strokeWidth}px ${strokeColor}` }}>{text}</span>
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 select-none"
        style={{ color: fillColor, WebkitTextStroke: `${strokeWidth}px ${fillColor}` }}
        initial={false}
        animate={{ clipPath: filled ? FULL[direction] : EMPTY[direction] }}
        transition={{ duration: reduce ? 0 : Math.max(0, duration), ease: [0.65, 0, 0.35, 1] }}
      >
        {text}
      </motion.span>
    </span>
  );
}
