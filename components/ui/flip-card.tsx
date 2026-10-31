"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react";

type FlipCardProps = {
  front: ReactNode;
  back: ReactNode;
  /** Flip while hovered, or toggle on click, Enter and Space. */
  trigger?: "hover" | "click";
  /** Length of the flip, in seconds. */
  duration?: number;
  className?: string;
};

const CONTROLS = "a, button, input, select, textarea, label, summary";

const FACE =
  "[grid-area:1/1] overflow-hidden rounded-3xl border border-ink-600 bg-ink-800 shadow-[0_24px_50px_-28px_rgb(0_0_0/0.9)]";

/** A two-sided card that turns over in 3D to show its back. */
export function FlipCard({ front, back, trigger = "hover", duration = 0.7, className = "" }: FlipCardProps) {
  const reduce = useReducedMotion();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [toggled, setToggled] = useState(false);
  const clickMode = trigger === "click";
  // Hover mode still flips for keyboard focus and for taps on touch screens.
  const flipped = clickMode ? toggled : hovered || focused || toggled;

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (!clickMode && e.pointerType !== "mouse") setToggled((v) => !v);
  }

  function onClick(e: MouseEvent<HTMLDivElement>) {
    if (!clickMode) return;
    // Let links and buttons inside the card do their own thing.
    const control = e.target instanceof Element ? e.target.closest(CONTROLS) : null;
    if (control && control !== e.currentTarget) return;
    setToggled((v) => !v);
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (!clickMode || e.target !== e.currentTarget) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setToggled((v) => !v);
    }
  }

  function onFocus(e: FocusEvent<HTMLDivElement>) {
    if (!clickMode && e.target === e.currentTarget && e.currentTarget.matches(":focus-visible")) setFocused(true);
  }

  function onBlur(e: FocusEvent<HTMLDivElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
  }

  const hidden = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" } as const;
  const transition = reduce ? { duration: 0.2 } : { type: "spring" as const, duration, bounce: 0.2 };

  return (
    <div
      role={clickMode ? "button" : undefined}
      aria-pressed={clickMode ? flipped : undefined}
      tabIndex={0}
      onPointerEnter={(e) => e.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onPointerDown={onPointerDown}
      onClick={onClick}
      onKeyDown={onKeyDown}
      onFocus={onFocus}
      onBlur={onBlur}
      className={`grid cursor-pointer rounded-3xl ${className}`}
      style={{ perspective: 1200 }}
    >
      <motion.div
        className="grid [grid-area:1/1]"
        style={{ transformStyle: "preserve-3d" }}
        initial={false}
        animate={{ rotateY: !reduce && flipped ? 180 : 0 }}
        transition={transition}
      >
        <motion.div
          className={FACE}
          style={hidden}
          aria-hidden={flipped || undefined}
          inert={flipped}
          initial={false}
          animate={{ opacity: reduce && flipped ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {front}
        </motion.div>
        <motion.div
          className={FACE}
          // With reduced motion the back sits flat on top and crossfades instead of turning over.
          style={{ ...hidden, rotateY: reduce ? 0 : 180 }}
          aria-hidden={!flipped || undefined}
          inert={!flipped}
          initial={false}
          animate={{ opacity: reduce && !flipped ? 0 : 1 }}
          transition={{ duration: 0.2 }}
        >
          {back}
        </motion.div>
      </motion.div>
    </div>
  );
}
