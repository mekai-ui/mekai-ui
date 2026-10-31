"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { Fragment, useRef } from "react";

type SplitTextProps = {
  text: string;
  /** Seconds between one letter and the next. */
  stagger?: number;
  /** Where the letters come from. */
  from?: "bottom" | "top";
  /** Play only the first time the text enters the viewport. */
  once?: boolean;
  className?: string;
};

/** Letters that spring into place one by one when the text scrolls into view. */
export function SplitText({ text, stagger = 0.035, from = "bottom", once = true, className = "" }: SplitTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, amount: 0.4 });
  const reduce = useReducedMotion();

  const words = text
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => Array.from(word));
  // Index of each word's first letter, so the stagger runs across the whole line.
  const starts: number[] = [];
  let total = 0;
  for (const letters of words) {
    starts.push(total);
    total += letters.length;
  }

  const sign = from === "bottom" ? 1 : -1;
  const hidden = { opacity: 0, y: `${0.75 * sign}em`, rotate: 14 * sign };
  const shown = { opacity: 1, y: "0em", rotate: 0 };

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((letters, w) => (
          <Fragment key={w}>
            {w > 0 ? " " : null}
            <span className="inline-block whitespace-nowrap">
              {letters.map((char, i) => {
                const d = (starts[w] + i) * stagger;
                return (
                  <motion.span
                    key={i}
                    className="inline-block"
                    style={{ transformOrigin: from === "bottom" ? "0% 100%" : "0% 0%" }}
                    initial={reduce ? false : hidden}
                    animate={reduce || inView ? shown : hidden}
                    transition={
                      reduce
                        ? { duration: 0 }
                        : inView
                          ? {
                              type: "spring",
                              stiffness: 420,
                              damping: 19,
                              mass: 0.8,
                              delay: d,
                              opacity: { duration: 0.25, delay: d },
                            }
                          : { duration: 0.2 }
                    }
                  >
                    {char}
                  </motion.span>
                );
              })}
            </span>
          </Fragment>
        ))}
      </span>
    </span>
  );
}
