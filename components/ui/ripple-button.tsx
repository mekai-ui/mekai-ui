"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, useState, type ComponentProps } from "react";

type RippleButtonProps = ComponentProps<"button"> & {
  /** Color of the ripple. */
  color?: string;
  /** How long a ripple takes to spread and fade, in seconds. */
  duration?: number;
};

type Ripple = { id: number; x: number; y: number; size: number };

/** A button whose ripple spreads from the exact point that was pressed. */
export function RippleButton({
  color = "#f4ede3",
  duration = 0.6,
  className = "",
  children,
  type = "button",
  onPointerDown,
  onKeyDown,
  ...rest
}: RippleButtonProps) {
  const reduce = useReducedMotion();
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const nextId = useRef(0);

  function spawn(el: HTMLButtonElement, clientX?: number, clientY?: number) {
    const rect = el.getBoundingClientRect();
    const x = clientX === undefined ? rect.width / 2 : clientX - rect.left;
    const y = clientY === undefined ? rect.height / 2 : clientY - rect.top;
    // Wide enough to reach the farthest corner from where it starts.
    const size = 2 * Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));
    const id = nextId.current++;
    setRipples((list) => [...list.slice(-4), { id, x, y, size }]);
  }

  return (
    <button
      type={type}
      {...rest}
      onPointerDown={(e) => {
        onPointerDown?.(e);
        if (!e.defaultPrevented && e.button === 0) spawn(e.currentTarget, e.clientX, e.clientY);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        // Keyboard presses ripple from the center.
        if (!e.defaultPrevented && !e.repeat && (e.key === "Enter" || e.key === " ")) spawn(e.currentTarget);
      }}
      className={`relative isolate inline-flex items-center justify-center gap-2 overflow-hidden rounded-full bg-ember px-7 py-3.5 font-display font-semibold text-ink-950 transition-colors hover:bg-ember-soft disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
    >
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 z-0">
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            className="absolute rounded-full"
            style={{ left: r.x - r.size / 2, top: r.y - r.size / 2, width: r.size, height: r.size, backgroundColor: color }}
            initial={{ scale: reduce ? 1 : 0, opacity: reduce ? 0.2 : 0.38 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={
              reduce
                ? { duration: 0.3 }
                : { scale: { duration, ease: [0.2, 0.7, 0.3, 1] }, opacity: { duration: duration * 1.15, ease: "easeIn" } }
            }
            onAnimationComplete={() => setRipples((list) => list.filter((item) => item.id !== r.id))}
          />
        ))}
      </span>
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  );
}
