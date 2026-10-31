"use client";

import { useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useEffectEvent, type FocusEvent, type ReactNode } from "react";

type GlareHoverProps = {
  children: ReactNode;
  /** Direction of the sweep in degrees, as in a CSS linear-gradient. */
  angle?: number;
  /** Width of the band of light, roughly as a percentage of the element. */
  width?: number;
  /** Color of the light. */
  color?: string;
  /** Strength of the light, from 0 to 1. */
  opacity?: number;
  /** Length of one sweep, in seconds. */
  duration?: number;
  /** Sweep once shortly after the component mounts. */
  playOnMount?: boolean;
  className?: string;
};

/** Where the band starts on one axis, so it begins fully outside the element. */
const startOn = (v: number) => (Math.abs(v) < 0.01 ? 50 : v > 0 ? 100 : 0);

/** A wrapper that sweeps a band of light across its content on hover and on keyboard focus. */
export function GlareHover({
  children,
  angle = 120,
  width = 30,
  color = "#f4ede3",
  opacity = 0.35,
  duration = 0.8,
  playOnMount = false,
  className = "",
}: GlareHoverProps) {
  const reduce = useReducedMotion();
  const [glare, animate] = useAnimate<HTMLSpanElement>();

  // The gradient is 2.5 times the element, so moving its position walks the band across and off the other side.
  const rad = (angle * Math.PI) / 180;
  const sx = startOn(Math.sin(rad));
  const sy = startOn(-Math.cos(rad));
  const from = `${sx}% ${sy}%`;
  const to = `${100 - sx}% ${100 - sy}%`;
  const half = Math.max(1, width) / 5;
  const band = `linear-gradient(${angle}deg, transparent ${50 - half}%, ${color} 50%, transparent ${50 + half}%)`;

  function play() {
    const el = glare.current;
    if (!el) return;
    if (reduce) {
      // No travelling light: a soft glow fades in and out in place.
      animate(el, { opacity: [0, opacity * 0.6, 0] }, { duration: 0.6 });
      return;
    }
    animate(el, { backgroundPosition: [from, to] }, { duration, ease: [0.3, 0.1, 0.25, 1] });
  }

  const playOnce = useEffectEvent(play);
  useEffect(() => {
    if (!playOnMount) return;
    const timer = window.setTimeout(playOnce, 300);
    return () => window.clearTimeout(timer);
  }, [playOnMount]);

  function onFocus(e: FocusEvent<HTMLDivElement>) {
    if (e.target instanceof Element && e.target.matches(":focus-visible")) play();
  }

  return (
    <div className={`relative isolate ${className}`} onPointerEnter={play} onFocus={onFocus}>
      {children}
      <span
        ref={glare}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit]"
        style={{
          backgroundImage: band,
          backgroundSize: "250% 250%",
          backgroundRepeat: "no-repeat",
          backgroundPosition: reduce ? "50% 50%" : from,
          opacity: reduce ? 0 : opacity,
        }}
      />
    </div>
  );
}
