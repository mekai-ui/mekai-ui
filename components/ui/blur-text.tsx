"use client";

import { motion, useInView, useReducedMotion } from "motion/react";
import { Fragment, useRef } from "react";

type BlurTextProps = {
  text: string;
  /** Seconds before the first word starts. */
  delay?: number;
  /** Seconds between one word and the next. */
  stagger?: number;
  /** "up" makes words rise into place, "down" makes them drop in. */
  direction?: "up" | "down";
  /** Play only the first time the text enters the viewport. */
  once?: boolean;
  className?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/** Words that sharpen out of a blur, one after another, when the text scrolls into view. */
export function BlurText({
  text,
  delay = 0,
  stagger = 0.08,
  direction = "up",
  once = true,
  className = "",
}: BlurTextProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once, amount: 0.3 });
  const reduce = useReducedMotion();
  const words = text.split(/\s+/).filter(Boolean);

  const hidden = { opacity: 0, filter: "blur(12px)", y: direction === "up" ? "0.45em" : "-0.45em" };
  const shown = { opacity: 1, filter: "blur(0px)", y: "0em" };

  return (
    <span ref={ref} className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <Fragment key={i}>
            {i > 0 ? " " : null}
            <motion.span
              className="inline-block will-change-[filter,transform]"
              initial={reduce ? false : hidden}
              animate={reduce || inView ? shown : hidden}
              transition={
                reduce
                  ? { duration: 0 }
                  : inView
                    ? { duration: 0.8, delay: delay + i * stagger, ease: EASE }
                    : { duration: 0.3, ease: EASE }
              }
            >
              {word}
            </motion.span>
          </Fragment>
        ))}
      </span>
    </span>
  );
}
