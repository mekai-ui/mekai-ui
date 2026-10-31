"use client";

import {
  animate,
  AnimatePresence,
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useState, type FocusEvent, type ReactNode } from "react";

export type OrbitItem = { icon: ReactNode; label: string };

export type OrbitRing = {
  /** Distance from the center, in pixels. */
  radius: number;
  /** Seconds for one lap. */
  speed: number;
  items: OrbitItem[];
  /** Turn this ring the other way. */
  reverse?: boolean;
};

type OrbitProps = {
  rings: OrbitRing[];
  /** Content in the middle. */
  center?: ReactNode;
  /** Turn every ring the other way. */
  reverse?: boolean;
  /** Ease to a stop while the pointer or keyboard focus is on the orbit. */
  pauseOnHover?: boolean;
  /** Item size, in pixels. */
  itemSize?: number;
  /** Draw the ring paths. */
  showRings?: boolean;
  /** Accessible name of the item list. */
  label?: string;
  className?: string;
};

const TAU = Math.PI * 2;

/** Items circling a center on one or more rings. They stay upright, and show their label on hover or focus. */
export function Orbit({
  rings,
  center,
  reverse = false,
  pauseOnHover = true,
  itemSize = 44,
  showRings = true,
  label = "Orbit",
  className = "",
}: OrbitProps) {
  const reduce = Boolean(useReducedMotion());
  // 1 is full speed, 0 is stopped.
  const pace = useMotionValue(1);
  const reach = Math.max(0, ...rings.map((r) => r.radius));
  const box = reach * 2 + itemSize;

  function setPaused(paused: boolean) {
    if (!pauseOnHover) return;
    animate(pace, paused ? 0 : 1, { duration: paused ? 0.4 : 0.7, ease: "easeOut" });
  }

  return (
    <div
      className={`relative shrink-0 ${className}`}
      style={{ width: box, height: box }}
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e: FocusEvent<HTMLDivElement>) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      {showRings
        ? rings.map((ring, i) => (
            <div
              key={i}
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 rounded-full border border-dashed border-ink-500"
              style={{ width: ring.radius * 2, height: ring.radius * 2, marginLeft: -ring.radius, marginTop: -ring.radius }}
            />
          ))
        : null}
      {center ? <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">{center}</div> : null}
      <ul aria-label={label} className="absolute inset-0">
        {rings.map((ring, i) => (
          <Ring
            key={i}
            ring={ring}
            direction={(ring.reverse ? -1 : 1) * (reverse ? -1 : 1)}
            pace={pace}
            itemSize={itemSize}
            reduce={reduce}
          />
        ))}
      </ul>
    </div>
  );
}

type RingProps = {
  ring: OrbitRing;
  direction: number;
  pace: MotionValue<number>;
  itemSize: number;
  reduce: boolean;
};

function Ring({ ring, direction, pace, itemSize, reduce }: RingProps) {
  const angle = useMotionValue(0);

  useAnimationFrame((_, delta) => {
    if (reduce || ring.speed <= 0) return;
    const step = direction * pace.get() * (TAU / ring.speed) * (Math.min(delta, 64) / 1000);
    angle.set((angle.get() + step) % TAU);
  });

  return (
    <>
      {ring.items.map((item, i) => (
        <OrbitNode
          key={`${item.label}-${i}`}
          item={item}
          angle={angle}
          offset={(i / ring.items.length) * TAU}
          radius={ring.radius}
          size={itemSize}
          reduce={reduce}
        />
      ))}
    </>
  );
}

type OrbitNodeProps = {
  item: OrbitItem;
  angle: MotionValue<number>;
  offset: number;
  radius: number;
  size: number;
  reduce: boolean;
};

function OrbitNode({ item, angle, offset, radius, size, reduce }: OrbitNodeProps) {
  const [active, setActive] = useState(false);
  // Position from the angle instead of rotating the ring, so the item itself never turns.
  const x = useTransform(angle, (a) => Math.cos(a + offset - Math.PI / 2) * radius);
  const y = useTransform(angle, (a) => Math.sin(a + offset - Math.PI / 2) * radius);

  return (
    <motion.li
      className="absolute left-1/2 top-1/2"
      style={{ x, y, width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, zIndex: active ? 10 : 1 }}
    >
      <span
        tabIndex={0}
        onPointerEnter={() => setActive(true)}
        onPointerLeave={() => setActive(false)}
        onFocus={() => setActive(true)}
        onBlur={() => setActive(false)}
        className="grid size-full place-items-center rounded-full border border-ink-600 bg-ink-800 text-bone shadow-[0_10px_24px_-12px_rgb(0_0_0/0.9)] transition-colors hover:border-ember/60 [&>svg]:size-1/2"
      >
        {item.icon}
        <span className="sr-only">{item.label}</span>
      </span>
      <AnimatePresence>
        {active ? (
          <motion.span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-ink-600 bg-ink-800 px-2.5 py-1 text-xs font-semibold text-bone shadow-lg"
            initial={{ opacity: 0, y: reduce ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            {item.label}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </motion.li>
  );
}
