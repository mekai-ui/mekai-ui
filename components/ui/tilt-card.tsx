"use client";

import { motion, useMotionTemplate, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";
import type { PointerEvent, ReactNode } from "react";

type TiltCardProps = {
  children: ReactNode;
  /** Largest tilt on each axis, in degrees. */
  maxTilt?: number;
  /** Show a soft highlight that follows the pointer. */
  glare?: boolean;
  /** Color of the highlight. */
  glareColor?: string;
  /** Scale while the pointer is over the card. */
  scale?: number;
  className?: string;
};

const SPRING = { stiffness: 240, damping: 22, mass: 0.6 };

/** A card that tilts in 3D toward the pointer with a moving glare, and springs back when the pointer leaves. */
export function TiltCard({
  children,
  maxTilt = 12,
  glare = true,
  glareColor = "#f4ede3",
  scale = 1.03,
  className = "",
}: TiltCardProps) {
  const reduce = useReducedMotion();
  const tilt = reduce ? 0 : maxTilt;

  // Pointer position over the card, 0 to 1 on each axis. It rests at the center.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const over = useMotionValue(0);
  const sx = useSpring(px, SPRING);
  const sy = useSpring(py, SPRING);
  const sOver = useSpring(over, SPRING);

  // The side under the pointer dips away, so the card turns to face it.
  const rotateX = useTransform(sy, [0, 1], [tilt, -tilt]);
  const rotateY = useTransform(sx, [0, 1], [-tilt, tilt]);
  const lift = useTransform(sOver, [0, 1], [1, reduce ? 1 : scale]);
  const glareOpacity = useTransform(sOver, [0, 1], [0, 0.24]);
  const gx = useTransform(sx, (v) => `${(v * 100).toFixed(1)}%`);
  const gy = useTransform(sy, (v) => `${(v * 100).toFixed(1)}%`);
  const glareBackground = useMotionTemplate`radial-gradient(circle at ${gx} ${gy}, ${glareColor}, transparent 62%)`;

  function track(e: PointerEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    px.set(Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)));
    py.set(Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)));
  }

  function enter(e: PointerEvent<HTMLDivElement>) {
    over.set(1);
    track(e);
  }

  function leave() {
    over.set(0);
    px.set(0.5);
    py.set(0.5);
  }

  return (
    // Pointer events live on the flat wrapper, so the hit area does not shift while the card tilts.
    <div
      className={`relative ${className}`}
      style={{ perspective: 900 }}
      onPointerEnter={enter}
      onPointerMove={track}
      onPointerLeave={leave}
      onPointerCancel={leave}
    >
      <motion.div
        style={{ rotateX, rotateY, scale: lift }}
        className="relative h-full overflow-hidden rounded-3xl border border-ink-600 bg-ink-800 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.85)] will-change-transform"
      >
        {children}
        {glare ? (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{ background: glareBackground, opacity: glareOpacity }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}
