"use client";

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, type PointerEvent } from "react";

type Direction = "up" | "down" | "left" | "right" | "up-left" | "up-right" | "down-left" | "down-right";

const D = Math.SQRT1_2;
const VECTORS: Record<Direction, [number, number]> = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0],
  "up-left": [-D, -D],
  "up-right": [D, -D],
  "down-left": [-D, D],
  "down-right": [D, D],
};

type EchoTextProps = {
  text: string;
  /** Number of trailing copies. */
  count?: number;
  /** Pixels between one echo and the next. */
  offset?: number;
  direction?: Direction;
  /** Echo colors, used in turn from the nearest echo outward. */
  colors?: string[];
  /** Solid copies or outlined ones. */
  variant?: "solid" | "outline";
  /** Seconds for one breath in and out. */
  speed?: number;
  /** On hover, the echoes swing toward the pointer. */
  followPointer?: boolean;
  className?: string;
};

/** A headline with trailing copies that fade out behind it and breathe in a slow loop. */
export function EchoText({
  text,
  count = 4,
  offset = 8,
  direction = "down-right",
  colors = ["#ff784f", "#ffc24a"],
  variant = "outline",
  speed = 3,
  followPointer = true,
  className = "",
}: EchoTextProps) {
  const reduce = useReducedMotion();
  const [dx, dy] = VECTORS[direction] ?? VECTORS["down-right"];
  const dirX = useSpring(dx, { stiffness: 120, damping: 18 });
  const dirY = useSpring(dy, { stiffness: 120, damping: 18 });
  const time = useMotionValue(0);

  useEffect(() => {
    dirX.set(dx);
    dirY.set(dy);
  }, [dx, dy, dirX, dirY]);

  useAnimationFrame((t) => {
    if (!reduce) time.set(t);
  });

  const follow = followPointer && !reduce;

  function onMove(e: PointerEvent<HTMLSpanElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const vx = e.clientX - (r.left + r.width / 2);
    const vy = e.clientY - (r.top + r.height / 2);
    const len = Math.hypot(vx, vy) || 1;
    dirX.set(vx / len);
    dirY.set(vy / len);
  }

  function onLeave() {
    dirX.set(dx);
    dirY.set(dy);
  }

  const echoes = Array.from({ length: Math.max(0, Math.round(count)) }, (_, i) => i + 1).reverse();
  const palette = colors.length ? colors : ["#ff784f"];

  return (
    <span
      className={`relative isolate inline-block ${className}`}
      onPointerMove={follow ? onMove : undefined}
      onPointerLeave={follow ? onLeave : undefined}
    >
      {echoes.map((i) => (
        <Echo
          key={i}
          text={text}
          step={i}
          count={echoes.length}
          dirX={dirX}
          dirY={dirY}
          time={time}
          offset={offset}
          speed={Math.max(0.5, speed)}
          color={palette[(i - 1) % palette.length]}
          outline={variant === "outline"}
          still={Boolean(reduce)}
        />
      ))}
      <span className="relative">{text}</span>
    </span>
  );
}

function Echo({
  text,
  step,
  count,
  dirX,
  dirY,
  time,
  offset,
  speed,
  color,
  outline,
  still,
}: {
  text: string;
  step: number;
  count: number;
  dirX: MotionValue<number>;
  dirY: MotionValue<number>;
  time: MotionValue<number>;
  offset: number;
  speed: number;
  color: string;
  outline: boolean;
  still: boolean;
}) {
  // Each echo breathes a little later than the one in front, so the stack ripples.
  const breath = () => (still ? 1 : 1 + 0.35 * Math.sin((time.get() / 1000 / speed) * Math.PI * 2 - step * 0.6));
  const x = useTransform(() => dirX.get() * offset * step * breath());
  const y = useTransform(() => dirY.get() * offset * step * breath());

  return (
    <motion.span
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 select-none"
      style={{
        x,
        y,
        opacity: (1 - step / (count + 1)) * 0.9,
        color: outline ? "transparent" : color,
        WebkitTextStroke: outline ? `0.022em ${color}` : undefined,
      }}
    >
      {text}
    </motion.span>
  );
}
