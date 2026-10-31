"use client";

import { motion, useMotionValue, useSpring } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

type MagneticButtonProps = {
  children: ReactNode;
  /** How strongly the button follows the pointer, 0 to 1. */
  strength?: number;
  className?: string;
  onClick?: () => void;
};

export function MagneticButton({ children, strength = 0.35, className = "", onClick }: MagneticButtonProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 18, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 18, mass: 0.6 });

  function onMove(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (rect.left + rect.width / 2)) * strength);
    y.set((e.clientY - (rect.top + rect.height / 2)) * strength);
  }

  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      onPointerMove={onMove}
      onPointerLeave={reset}
      style={{ x: sx, y: sy }}
      whileTap={{ scale: 0.95 }}
      className={`rounded-full bg-bone px-7 py-3.5 font-display font-semibold text-black ${className}`}
    >
      <motion.span className="block" style={{ x: sx, y: sy }}>
        {children}
      </motion.span>
    </motion.button>
  );
}
