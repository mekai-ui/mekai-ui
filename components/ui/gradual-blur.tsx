"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Edge = "top" | "bottom" | "left" | "right";

type GradualBlurProps = {
  children: ReactNode;
  /** Edge of the scroll area that gets blurred. */
  position?: Edge;
  /** Blur at the very edge, in pixels. */
  strength?: number;
  /** Depth of the blurred band in pixels: its height, or its width on the left and right. */
  height?: number;
  /** Number of stacked blur layers. More layers give a smoother ramp. */
  layers?: number;
  /** Fade the blur out once the scroll reaches that edge. */
  fadeAtEnd?: boolean;
  /** Optional color laid over the band, fading toward the edge. */
  tint?: string;
  /** Accessible name of the scroll area. */
  label?: string;
  /** Classes for the outer frame. Give it a height or width so it can scroll. */
  className?: string;
  /** Classes for the scrolling content, such as a flex row for horizontal scrolling. */
  contentClassName?: string;
};

const DIRECTION: Record<Edge, string> = { top: "to top", bottom: "to bottom", left: "to left", right: "to right" };

function reachedEdge(el: HTMLElement, edge: Edge) {
  switch (edge) {
    case "top":
      return el.scrollTop <= 1;
    case "bottom":
      return el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    case "left":
      return el.scrollLeft <= 1;
    case "right":
      return el.scrollLeft + el.clientWidth >= el.scrollWidth - 1;
  }
}

function bandStyle(edge: Edge, depth: number): CSSProperties {
  switch (edge) {
    case "top":
      return { top: 0, left: 0, right: 0, height: depth };
    case "bottom":
      return { bottom: 0, left: 0, right: 0, height: depth };
    case "left":
      return { top: 0, bottom: 0, left: 0, width: depth };
    case "right":
      return { top: 0, bottom: 0, right: 0, width: depth };
  }
}

/** A scroll area whose edge melts into a progressive blur, which clears once you reach that edge. */
export function GradualBlur({
  children,
  position = "bottom",
  strength = 8,
  height = 96,
  layers = 5,
  fadeAtEnd = true,
  tint,
  label,
  className = "",
  contentClassName = "",
}: GradualBlurProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [atEdge, setAtEdge] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content) return;
    const check = () => setAtEdge(reachedEdge(el, position));
    const observer = new ResizeObserver(check);
    observer.observe(el);
    observer.observe(content);
    el.addEventListener("scroll", check, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", check);
    };
  }, [position]);

  const count = Math.max(1, Math.min(12, Math.round(layers)));
  const direction = DIRECTION[position];

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div
        ref={scrollRef}
        role={label ? "region" : undefined}
        aria-label={label}
        tabIndex={0}
        className="thin-scroll size-full overflow-auto rounded-[inherit]"
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </div>

      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute z-10"
        style={bandStyle(position, height)}
        initial={false}
        animate={{ opacity: fadeAtEnd && atEdge ? 0 : 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {Array.from({ length: count }, (_, i) => {
          // Each layer doubles the blur of the one before and starts a step closer to the edge,
          // so the blur builds up smoothly instead of in bands.
          const blur = `blur(${(strength * 2 ** (i + 1 - count)).toFixed(2)}px)`;
          const mask = `linear-gradient(${direction}, transparent ${(i / count) * 100}%, #000 ${((i + 1) / count) * 100}%)`;
          return (
            <div
              key={i}
              className="absolute inset-0"
              style={{ backdropFilter: blur, WebkitBackdropFilter: blur, maskImage: mask, WebkitMaskImage: mask }}
            />
          );
        })}
        {tint ? <div className="absolute inset-0" style={{ background: `linear-gradient(${direction}, transparent, ${tint})` }} /> : null}
      </motion.div>
    </div>
  );
}
