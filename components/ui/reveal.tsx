"use client";

import { motion, useInView, useReducedMotion, type TargetAndTransition } from "motion/react";
import { Children, isValidElement, useRef, type ReactNode, type RefObject } from "react";

export type RevealVariant = "fade" | "slide-up" | "slide-left" | "blur" | "scale";

type RevealProps = {
  children: ReactNode;
  /** How the content arrives. */
  variant?: RevealVariant;
  /** Wait before playing, in seconds. */
  delay?: number;
  /** Length of the animation, in seconds. */
  duration?: number;
  /** How far slides travel, in pixels. Also sets the blur and scale strength. */
  distance?: number;
  /** Play only the first time; otherwise hide again when scrolled out. */
  once?: boolean;
  /** Seconds between direct children. 0 animates everything together. */
  stagger?: number;
  /** Share of the element that must be visible before it plays, from 0 to 1. */
  amount?: number;
  /** Scrolling element to watch instead of the page, such as a scrolling panel. */
  root?: RefObject<Element | null>;
  className?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

function hiddenState(variant: RevealVariant, distance: number, reduce: boolean): TargetAndTransition {
  if (reduce) return { opacity: 0 };
  switch (variant) {
    case "slide-up":
      return { opacity: 0, y: distance };
    case "slide-left":
      return { opacity: 0, x: distance };
    case "blur":
      return { opacity: 0, filter: `blur(${Math.max(4, distance / 2)}px)` };
    case "scale":
      return { opacity: 0, scale: Math.max(0.5, 1 - distance / 240) };
    default:
      return { opacity: 0 };
  }
}

/** The resting state for exactly the properties the hidden state touches. */
function shownState(hidden: TargetAndTransition): TargetAndTransition {
  return {
    opacity: 1,
    ...("x" in hidden ? { x: 0 } : {}),
    ...("y" in hidden ? { y: 0 } : {}),
    ...("scale" in hidden ? { scale: 1 } : {}),
    ...("filter" in hidden ? { filter: "blur(0px)" } : {}),
  };
}

/** A wrapper that animates its content in as it scrolls into view, with an optional stagger. */
export function Reveal({
  children,
  variant = "slide-up",
  delay = 0,
  duration = 0.6,
  distance = 24,
  once = true,
  stagger = 0,
  amount = 0.3,
  root,
  className = "",
}: RevealProps) {
  const reduce = Boolean(useReducedMotion());
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { root, once, amount });
  const hidden = hiddenState(variant, distance, reduce);
  const shown = shownState(hidden);
  const time = reduce ? Math.min(duration, 0.3) : duration;

  if (stagger > 0) {
    return (
      <div ref={ref} className={className}>
        {Children.toArray(children).map((child, i) => (
          <motion.div
            key={isValidElement(child) && child.key !== null ? child.key : i}
            initial={hidden}
            animate={inView ? shown : hidden}
            transition={{ duration: time, delay: inView ? delay + i * stagger : 0, ease: EASE }}
          >
            {child}
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={hidden}
      animate={inView ? shown : hidden}
      transition={{ duration: time, delay: inView ? delay : 0, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}
