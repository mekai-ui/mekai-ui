"use client";

import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type CircularTextProps = {
  text: string;
  /** Seconds for one full turn. 0 keeps the ring still. */
  duration?: number;
  /** What the ring does while hovered or while something inside it has focus. */
  hoverEffect?: "speedUp" | "pause" | "reverse";
  /** Width and height of the ring in pixels. */
  size?: number;
  fontSize?: number;
  /** How many times the text goes around the ring. */
  repeat?: number;
  /** Placed after each repetition, so the seam looks like every other gap. */
  separator?: string;
  /** Content for the middle of the ring, such as an icon or a logo. */
  children?: ReactNode;
  className?: string;
};

/** Text set around a circle that turns slowly, with a slot in the middle for an icon or logo. */
export function CircularText({
  text,
  duration = 20,
  hoverEffect = "speedUp",
  size = 200,
  fontSize = 15,
  repeat = 2,
  separator = " • ",
  children,
  className = "",
}: CircularTextProps) {
  const pathId = `ring-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const reduce = useReducedMotion();
  const [engaged, setEngaged] = useState(false);
  const measureRef = useRef<SVGTextElement>(null);
  const textRef = useRef<SVGTextElement>(null);

  const base = !reduce && duration > 0 ? 360 / duration : 0;
  const goal = !engaged ? base : hoverEffect === "speedUp" ? base * 4 : hoverEffect === "pause" ? 0 : -base;
  const rotate = useMotionValue(0);
  // Degrees per second, eased so speed changes never jerk.
  const rate = useSpring(goal, { stiffness: 60, damping: 18 });

  useEffect(() => {
    rate.set(goal);
  }, [goal, rate]);

  useAnimationFrame((_, delta) => {
    const r = rate.get();
    if (Math.abs(r) < 0.01) return;
    rotate.set((rotate.get() + (r * delta) / 1000) % 360);
  });

  const content = Array.from({ length: Math.max(1, Math.round(repeat)) }, () => `${text}${separator}`).join("");
  const c = size / 2;
  const r = Math.max(4, c - fontSize * 0.9);
  const circumference = 2 * Math.PI * r;
  const path = `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c} ${c + r} A ${r} ${r} 0 1 1 ${c} ${c - r}`;

  // Spread the letters so the text fills the ring exactly, whatever its length or font.
  useEffect(() => {
    const measure = measureRef.current;
    const ring = textRef.current;
    if (!measure || !ring) return;
    let alive = true;
    const fit = () => {
      if (!alive) return;
      const natural = measure.getComputedTextLength();
      const chars = Array.from(content).length;
      if (natural > 0 && chars > 0) ring.style.letterSpacing = `${(circumference - natural) / chars}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    return () => {
      alive = false;
    };
  }, [content, circumference, fontSize]);

  return (
    <div
      className={`relative inline-grid shrink-0 place-items-center ${className}`}
      style={{ width: size, height: size }}
      onPointerEnter={() => setEngaged(true)}
      onPointerLeave={() => setEngaged(false)}
      onFocus={() => setEngaged(true)}
      onBlur={() => setEngaged(false)}
    >
      <span className="sr-only">{text}</span>
      <motion.div aria-hidden="true" className="absolute inset-0" style={{ rotate }}>
        <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
          <defs>
            <path id={pathId} d={path} fill="none" />
          </defs>
          <text ref={measureRef} fontSize={fontSize} visibility="hidden" style={{ letterSpacing: 0, whiteSpace: "pre" }}>
            {content}
          </text>
          <text ref={textRef} fontSize={fontSize} fill="currentColor" style={{ whiteSpace: "pre" }}>
            <textPath href={`#${pathId}`}>{content}</textPath>
          </text>
        </svg>
      </motion.div>
      {children ? <div className="relative">{children}</div> : null}
    </div>
  );
}
