"use client";

import { motion, useReducedMotion } from "motion/react";

type ShinyTextProps = {
  text: string;
  /** Seconds for one sweep of light across the text. */
  speed?: number;
  shineColor?: string;
  baseColor?: string;
  className?: string;
};

/** Text with a soft band of light that sweeps across it on a loop. */
export function ShinyText({
  text,
  speed = 2.4,
  shineColor = "#f4ede3",
  baseColor = "#857c71",
  className = "",
}: ShinyTextProps) {
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <span className={className} style={{ color: baseColor }}>
        {text}
      </span>
    );
  }

  return (
    <motion.span
      className={`inline-block bg-clip-text ${className}`}
      style={{
        color: "transparent",
        WebkitBackgroundClip: "text",
        backgroundImage: `linear-gradient(110deg, ${baseColor} 0%, ${baseColor} 42%, ${shineColor} 50%, ${baseColor} 58%, ${baseColor} 100%)`,
        backgroundSize: "300% 100%",
      }}
      // The gradient is three times wider than the text; sliding it from the right edge to the left one
      // carries the bright band across from left to right.
      initial={{ backgroundPosition: "100% 50%" }}
      animate={{ backgroundPosition: "0% 50%" }}
      transition={{ duration: Math.max(0.3, speed), ease: "linear", repeat: Infinity, repeatDelay: speed * 0.4 }}
    >
      {text}
    </motion.span>
  );
}
