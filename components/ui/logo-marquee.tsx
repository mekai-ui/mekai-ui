"use client";

import { animate, motion, useAnimationFrame, useMotionValue, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type LogoMarqueeProps = {
  items: ReactNode[];
  /** Scroll speed in pixels per second. */
  speed?: number;
  direction?: "left" | "right";
  /** Ease to a stop while the pointer or keyboard focus is on the row. */
  pauseOnHover?: boolean;
  /** Space between items, in pixels. */
  gap?: number;
  /** Fade the row out at both edges. */
  fade?: boolean;
  className?: string;
};

const EDGE_FADE = "linear-gradient(to right, transparent, #000 12%, #000 88%, transparent)";

/** An endless row of logos or any other items, with faded edges and a pause on hover. */
export function LogoMarquee({
  items,
  speed = 40,
  direction = "left",
  pauseOnHover = true,
  gap = 48,
  fade = true,
  className = "",
}: LogoMarqueeProps) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLUListElement>(null);
  const [setWidth, setSetWidth] = useState(0);
  const [copies, setCopies] = useState(2);
  const x = useMotionValue(0);
  // 1 is full speed, 0 is stopped. Animated so hover slows the row down instead of freezing it.
  const pace = useMotionValue(1);

  useEffect(() => {
    const root = rootRef.current;
    const set = setRef.current;
    if (!root || !set) return;
    const observer = new ResizeObserver(() => {
      const width = set.offsetWidth;
      setSetWidth(width);
      // Enough copies to cover the row while one of them is scrolled out of view.
      setCopies(width > 0 ? Math.max(2, Math.ceil(root.offsetWidth / width) + 1) : 2);
    });
    observer.observe(root);
    observer.observe(set);
    return () => observer.disconnect();
  }, [reduce]);

  useAnimationFrame((_, delta) => {
    if (reduce || setWidth <= 0) return;
    const step = (direction === "left" ? -1 : 1) * speed * pace.get() * (Math.min(delta, 64) / 1000);
    // Keep x within one set width, so the loop never runs out of copies.
    const next = x.get() + step;
    x.set((((next % setWidth) + setWidth) % setWidth) - setWidth);
  });

  function setPaused(paused: boolean) {
    if (!pauseOnHover) return;
    animate(pace, paused ? 0 : 1, { duration: paused ? 0.35 : 0.6, ease: "easeOut" });
  }

  const mask = fade ? EDGE_FADE : undefined;

  if (reduce) {
    // No scrolling: show every item once, wrapped and centered.
    return (
      <div ref={rootRef} className={`relative ${className}`}>
        <ul ref={setRef} className="flex flex-wrap items-center justify-center" style={{ gap }}>
          {items.map((item, i) => (
            <li key={i} className="shrink-0">
              {item}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div
      ref={rootRef}
      className={`relative overflow-hidden ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <motion.div className="flex w-max will-change-transform" style={{ x }}>
        {Array.from({ length: copies }, (_, copy) => (
          // Only the first copy is read by screen readers and reachable by keyboard.
          <ul
            key={copy}
            ref={copy === 0 ? setRef : undefined}
            aria-hidden={copy > 0 ? true : undefined}
            inert={copy > 0}
            className="flex shrink-0 items-center"
            style={{ gap, paddingRight: gap }}
          >
            {items.map((item, i) => (
              <li key={i} className="shrink-0">
                {item}
              </li>
            ))}
          </ul>
        ))}
      </motion.div>
    </div>
  );
}
