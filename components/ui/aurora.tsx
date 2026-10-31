"use client";

import { motion, useReducedMotion } from "motion/react";

type AuroraProps = {
  /** Three hex colors, used from the back layer to the front. */
  colors?: [string, string, string];
  /** Drift speed multiplier. */
  speed?: number;
  /** Blur radius of the back layer, in pixels. The front layer uses a little less. */
  blur?: number;
  /** Overall opacity, from 0 to 1. */
  opacity?: number;
  className?: string;
};

type Blob = {
  /** Index into colors. */
  c: number;
  /** Box in percent of the parent. */
  left: number;
  top: number;
  w: number;
  h: number;
  /** Drift path in percent of the blob's own size, scale and tilt keyframes, loop length in seconds. */
  x: number[];
  y: number[];
  scale: number[];
  rotate: number[];
  duration: number;
  front?: boolean;
};

// Back layer: wide, slow pools of color. Front layer: thinner ribbons that tilt like curtains of light.
const BLOBS: Blob[] = [
  { c: 0, left: -12, top: -20, w: 72, h: 66, x: [0, 18, -4, 0], y: [0, 12, 24, 0], scale: [1, 1.16, 0.94, 1], rotate: [0, 0, 0, 0], duration: 28 },
  { c: 1, left: 46, top: -14, w: 58, h: 56, x: [0, -16, 8, 0], y: [0, 20, 4, 0], scale: [1, 0.9, 1.12, 1], rotate: [0, 0, 0, 0], duration: 24 },
  { c: 2, left: 18, top: 42, w: 64, h: 60, x: [0, 14, -12, 0], y: [0, -16, -6, 0], scale: [1.05, 0.94, 1.14, 1.05], rotate: [0, 0, 0, 0], duration: 32 },
  { c: 0, left: 52, top: 30, w: 70, h: 22, x: [0, -22, -6, 0], y: [0, -18, 14, 0], scale: [1, 1.12, 0.96, 1], rotate: [-14, -4, -18, -14], duration: 21, front: true },
  { c: 1, left: -6, top: 22, w: 66, h: 18, x: [0, 18, 28, 0], y: [0, 22, -8, 0], scale: [0.95, 1.08, 1, 0.95], rotate: [10, 18, 4, 10], duration: 19, front: true },
  { c: 2, left: 28, top: 4, w: 48, h: 16, x: [0, 24, -18, 0], y: [0, 30, 10, 0], scale: [1, 0.86, 1.1, 1], rotate: [-6, 6, -2, -6], duration: 17, front: true },
];

const pct = (values: number[]) => values.map((v) => `${v}%`);

/** Soft blurred color blobs drifting slowly in two layers. Fills its nearest positioned parent. */
export function Aurora({
  colors = ["#ff784f", "#ffc24a", "#e2552b"],
  speed = 1,
  blur = 70,
  opacity = 0.6,
  className = "",
}: AuroraProps) {
  const reduce = useReducedMotion();
  const pace = Math.max(speed, 0.05);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 isolate overflow-hidden ${className}`}
      style={{ opacity: Math.min(1, Math.max(0, opacity)) }}
    >
      {BLOBS.map((b, i) => {
        const color = colors[b.c % colors.length] ?? "#ff784f";
        return (
          <motion.div
            key={i}
            className="absolute rounded-full will-change-transform"
            style={{
              left: `${b.left}%`,
              top: `${b.top}%`,
              width: `${b.w}%`,
              height: `${b.h}%`,
              background: `radial-gradient(closest-side, ${color}, transparent)`,
              filter: `blur(${Math.max(0, b.front ? blur * 0.55 : blur)}px)`,
              mixBlendMode: b.front ? "screen" : "normal",
              opacity: b.front ? 0.75 : 1,
              rotate: b.rotate[0],
              scale: b.scale[0],
            }}
            animate={reduce ? undefined : { x: pct(b.x), y: pct(b.y), scale: b.scale, rotate: b.rotate }}
            transition={{ duration: b.duration / pace, repeat: Infinity, ease: "easeInOut" }}
          />
        );
      })}
    </div>
  );
}
