"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

type TypewriterProps = {
  phrases: string[];
  /** Average milliseconds per typed character. */
  typeSpeed?: number;
  /** Milliseconds per deleted character. */
  deleteSpeed?: number;
  /** Milliseconds a finished phrase stays before it is deleted. */
  pause?: number;
  /** Start again from the first phrase after the last one. */
  loop?: boolean;
  /** Show a blinking caret after the text. */
  caret?: boolean;
  caretColor?: string;
  className?: string;
};

type Step = { index: number; length: number; deleting: boolean };

/** Types a list of phrases one character at a time, deletes them and moves on, with a blinking caret. */
export function Typewriter({
  phrases,
  typeSpeed = 70,
  deleteSpeed = 40,
  pause = 1400,
  loop = true,
  caret = true,
  caretColor = "#ff784f",
  className = "",
}: TypewriterProps) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>({ index: 0, length: 0, deleting: false });
  const count = phrases.length;
  const index = count ? step.index % count : 0;
  const chars = Array.from(phrases[index] ?? "");
  const full = chars.length;
  const isLast = index === count - 1;
  const typed = !step.deleting && step.length >= full;
  const finished = typed && isLast && !loop;

  useEffect(() => {
    if (reduce || count === 0 || finished) return;
    const { length, deleting } = step;
    let wait: number;
    let next: Step;
    if (!deleting && length < full) {
      // A little jitter makes the typing feel human.
      wait = typeSpeed * (0.6 + Math.random() * 0.8);
      next = { index, length: length + 1, deleting: false };
    } else if (!deleting) {
      wait = pause;
      next = { index, length, deleting: true };
    } else if (length > 0) {
      wait = deleteSpeed;
      next = { index, length: length - 1, deleting: true };
    } else {
      wait = Math.max(220, typeSpeed * 3);
      next = { index: (index + 1) % count, length: 0, deleting: false };
    }
    const id = setTimeout(() => setStep(next), wait);
    return () => clearTimeout(id);
  }, [step, index, full, count, finished, reduce, typeSpeed, deleteSpeed, pause]);

  const shown = reduce ? (loop ? phrases[0] : phrases[count - 1]) ?? "" : chars.slice(0, step.length).join("");
  // Solid while typing or deleting, blinking while it waits.
  const blink = !reduce && (typed || (step.deleting && step.length === 0));

  return (
    <span className={className}>
      <span className="sr-only">{phrases.join(", ")}</span>
      <span aria-hidden="true">
        {shown || "​"}
        {caret ? (
          <motion.span
            className="ml-[0.06em] inline-block h-[0.9em] w-[0.08em] translate-y-[0.1em] rounded-[1px]"
            style={{ backgroundColor: caretColor }}
            animate={blink ? { opacity: [1, 1, 0, 0] } : { opacity: 1 }}
            transition={
              blink ? { duration: 1, times: [0, 0.5, 0.55, 1], ease: "linear", repeat: Infinity } : { duration: 0 }
            }
          />
        ) : null}
      </span>
    </span>
  );
}
