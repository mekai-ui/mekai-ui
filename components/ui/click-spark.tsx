"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRef, useState, type MouseEvent, type ReactNode } from "react";

type ClickSparkProps = {
  children: ReactNode;
  /** Color of the sparks. */
  color?: string;
  /** Number of spark lines in each burst. */
  count?: number;
  /** How far the sparks travel from the click, in pixels. */
  radius?: number;
  /** Length of one burst, in seconds. */
  duration?: number;
  className?: string;
};

type Burst = { id: number; x: number; y: number };

/** A wrapper that throws short spark lines out of every click inside it. */
export function ClickSpark({
  children,
  color = "#ffc24a",
  count = 8,
  radius = 28,
  duration = 0.45,
  className = "",
}: ClickSparkProps) {
  const reduce = useReducedMotion();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const nextId = useRef(0);

  function spark(e: MouseEvent<HTMLDivElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    let x = e.clientX;
    let y = e.clientY;
    // A keyboard press has no pointer position: start from the center of the element it activated.
    if (e.detail === 0 && e.target instanceof Element) {
      const target = e.target.getBoundingClientRect();
      x = target.left + target.width / 2;
      y = target.top + target.height / 2;
    }
    const id = nextId.current++;
    setBursts((list) => [...list.slice(-5), { id, x: x - box.left, y: y - box.top }]);
  }

  function remove(id: number) {
    setBursts((list) => list.filter((b) => b.id !== id));
  }

  return (
    <div className={`relative ${className}`} onClick={spark}>
      {children}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {bursts.map((b) => (
          <SparkBurst
            key={b.id}
            x={b.x}
            y={b.y}
            color={color}
            count={count}
            radius={radius}
            duration={duration}
            reduce={Boolean(reduce)}
            onDone={() => remove(b.id)}
          />
        ))}
      </div>
    </div>
  );
}

type SparkBurstProps = {
  x: number;
  y: number;
  color: string;
  count: number;
  radius: number;
  duration: number;
  reduce: boolean;
  onDone: () => void;
};

function SparkBurst({ x, y, color, count, radius, duration, reduce, onDone }: SparkBurstProps) {
  if (reduce) {
    // No flying lines: a small dot that fades in place.
    return (
      <motion.span
        className="absolute size-2 rounded-full"
        style={{ left: x - 4, top: y - 4, backgroundColor: color }}
        initial={{ opacity: 0.9 }}
        animate={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        onAnimationComplete={onDone}
      />
    );
  }

  const lines = Math.max(1, Math.round(count));
  const length = radius * 0.5;

  return (
    <>
      {Array.from({ length: lines }, (_, i) => (
        // The outer span sets the direction; the line then travels along its own x axis.
        <span
          key={i}
          className="absolute size-0"
          style={{ left: x, top: y, transform: `rotate(${(i / lines) * 360}deg)` }}
        >
          <motion.span
            className="absolute left-0 top-[-1px] block h-0.5 origin-left rounded-full"
            style={{ width: length, backgroundColor: color }}
            initial={{ x: radius * 0.1, scaleX: 1, opacity: 1 }}
            animate={{ x: radius, scaleX: 0, opacity: 0.4 }}
            transition={{ duration, ease: [0.16, 0.8, 0.3, 1] }}
            onAnimationComplete={i === 0 ? onDone : undefined}
          />
        </span>
      ))}
    </>
  );
}
