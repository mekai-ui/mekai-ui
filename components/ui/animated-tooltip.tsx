"use client";

import { AnimatePresence, motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
  type ReactElement,
  type ReactNode,
} from "react";

type Side = "top" | "bottom" | "left" | "right";

type AnimatedTooltipProps = {
  content: ReactNode;
  side?: Side;
  /** Hover delay before showing, in ms. Keyboard focus shows it at once. */
  delay?: number;
  /** Force the tooltip open or closed. */
  open?: boolean;
  /** The trigger: a single focusable element, such as a button. */
  children: ReactNode;
  /** Extra classes for the bubble. */
  className?: string;
};

const PLACEMENT: Record<Side, string> = {
  top: "bottom-full left-1/2 mb-2.5 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2.5 -translate-x-1/2",
  left: "right-full top-1/2 mr-2.5 -translate-y-1/2",
  right: "left-full top-1/2 ml-2.5 -translate-y-1/2",
};

const ARROW: Record<Side, string> = {
  top: "left-1/2 top-full -mt-1 -translate-x-1/2 border-b border-r",
  bottom: "left-1/2 bottom-full -mb-1 -translate-x-1/2 border-l border-t",
  left: "top-1/2 left-full -ml-1 -translate-y-1/2 border-r border-t",
  right: "top-1/2 right-full -mr-1 -translate-y-1/2 border-b border-l",
};

const ORIGIN: Record<Side, string> = { top: "50% 100%", bottom: "50% 0%", left: "100% 50%", right: "0% 50%" };

/** A tooltip that springs out of its trigger and leans toward the pointer. Shows on hover and focus. */
export function AnimatedTooltip({ content, side = "top", delay = 300, open: forced, children, className = "" }: AnimatedTooltipProps) {
  const id = useId();
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const horizontal = side === "top" || side === "bottom";

  // The bubble follows the pointer along the trigger by a few pixels, with a slight tilt.
  const follow = useMotionValue(0);
  const drift = useSpring(follow, { stiffness: 260, damping: 18 });
  const tilt = useTransform(drift, [-14, 14], [-5, 5]);

  const open = forced ?? shown;

  useEffect(() => {
    const t = timer;
    return () => clearTimeout(t.current);
  }, []);

  function show(now: boolean) {
    clearTimeout(timer.current);
    if (now || delay <= 0) setShown(true);
    else timer.current = setTimeout(() => setShown(true), delay);
  }

  function hide() {
    clearTimeout(timer.current);
    setShown(false);
    follow.set(0);
  }

  function onPointerMove(e: PointerEvent<HTMLSpanElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    const d = horizontal ? e.clientX - (rect.left + rect.width / 2) : e.clientY - (rect.top + rect.height / 2);
    follow.set(Math.max(-14, Math.min(14, d * 0.35)));
  }

  function onFocus(e: FocusEvent<HTMLSpanElement>) {
    // Only keyboard focus: a mouse click already has hover handling it.
    if (e.target instanceof HTMLElement && e.target.matches(":focus-visible")) show(true);
  }

  const trigger = isValidElement(children)
    ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, { "aria-describedby": open ? id : undefined })
    : children;

  // Enter from the trigger: along y for top and bottom, along x for left and right.
  const enterDistance = side === "top" || side === "left" ? 6 : -6;
  const offset = (d: number) => (horizontal ? { y: d } : { x: d });

  return (
    <span
      className="relative inline-flex"
      onPointerEnter={(e) => e.pointerType === "mouse" && show(false)}
      onPointerLeave={hide}
      onPointerMove={onPointerMove}
      onPointerDown={hide}
      onFocus={onFocus}
      onBlur={hide}
      onKeyDown={(e) => {
        if (e.key === "Escape" && shown) {
          e.stopPropagation();
          hide();
        }
      }}
    >
      {trigger}
      <AnimatePresence>
        {open ? (
          <motion.span
            key="tooltip"
            id={id}
            role="tooltip"
            initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85, ...offset(enterDistance) }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, ...offset(0) }}
            exit={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, scale: 0.92, ...offset(enterDistance / 2), transition: { duration: 0.12 } }
            }
            transition={reduce ? { duration: 0.12 } : { type: "spring", stiffness: 520, damping: 26 }}
            style={
              horizontal
                ? { x: drift, rotate: tilt, transformOrigin: ORIGIN[side] }
                : { y: drift, transformOrigin: ORIGIN[side] }
            }
            className={`pointer-events-none absolute z-50 w-max max-w-60 rounded-xl border border-ink-500 bg-ink-700 px-2.5 py-1.5 text-xs font-semibold text-bone shadow-[0_12px_30px_-10px_rgb(0_0_0/0.9)] ${PLACEMENT[side]} ${className}`}
          >
            <span aria-hidden="true" className={`absolute size-2 rotate-45 border-ink-500 bg-ink-700 ${ARROW[side]}`} />
            <span className="relative">{content}</span>
          </motion.span>
        ) : null}
      </AnimatePresence>
    </span>
  );
}
