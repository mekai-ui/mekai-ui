"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { useRef } from "react";

type MaskedRevealProps = {
  /** One string per line of the heading. */
  lines: string[];
  /** The heading element to render. */
  as?: "h1" | "h2" | "h3" | "h4" | "p";
  /** Seconds before the first line starts. */
  delay?: number;
  /** Seconds between one line and the next. */
  stagger?: number;
  /** Seconds for each line to slide up. */
  duration?: number;
  /** Play only the first time the heading enters the viewport. */
  once?: boolean;
  /** Draw an accent line under the last line once it has landed. */
  underline?: boolean;
  underlineColor?: string;
  className?: string;
};

const EASE = [0.16, 1, 0.3, 1] as const;

/** A multi-line heading whose lines slide up from behind a mask, one after another, as it enters the viewport. */
export function MaskedReveal({
  lines,
  as: Tag = "h2",
  delay = 0,
  stagger = 0.12,
  duration = 0.9,
  once = true,
  underline = true,
  underlineColor = "#ff784f",
  className = "",
}: MaskedRevealProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, amount: 0.35 });
  const reduce = useReducedMotion();
  const show = Boolean(reduce) || inView;
  const last = lines.length - 1;

  return (
    <Tag className={className}>
      <span className="sr-only">{lines.join(" ")}</span>
      <span ref={ref} aria-hidden="true" className="block">
        {lines.map((line, i) => (
          // The padding gives descenders and the underline room inside the mask.
          <span key={i} className="-mb-[0.16em] block overflow-hidden pb-[0.16em]">
            <motion.span
              className="relative inline-block"
              initial={reduce ? false : { y: "115%" }}
              animate={{ y: show ? "0%" : "115%" }}
              transition={
                reduce
                  ? { duration: 0 }
                  : { duration: show ? duration : 0.3, delay: show ? delay + i * stagger : 0, ease: EASE }
              }
            >
              {line}
              {underline && i === last ? (
                <motion.span
                  className="absolute left-0 top-full h-[0.07em] min-h-[2px] w-full origin-left rounded-full"
                  style={{ backgroundColor: underlineColor }}
                  initial={reduce ? false : { scaleX: 0 }}
                  animate={{ scaleX: show ? 1 : 0 }}
                  transition={
                    reduce
                      ? { duration: 0 }
                      : {
                          duration: show ? 0.7 : 0.2,
                          delay: show ? delay + last * stagger + duration * 0.75 : 0,
                          ease: EASE,
                        }
                  }
                />
              ) : null}
            </motion.span>
          </span>
        ))}
      </span>
    </Tag>
  );
}
