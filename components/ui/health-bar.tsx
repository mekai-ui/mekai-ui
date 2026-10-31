"use client";

import { motion, useAnimate, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

type HealthBarProps = {
  /** Current health. Lower it to deal damage, raise it to heal. */
  value: number;
  max?: number;
  /** Fill color of the health bar. */
  color?: string;
  /** Color of the chip bar that trails behind after damage. */
  chipColor?: string;
  /** Glow and fill color shown while healing. */
  healColor?: string;
  /** Show the current and maximum values next to the label. */
  showNumbers?: boolean;
  label?: string;
  className?: string;
};

type Change = { n: number; kind: "damage" | "heal"; delta: number };

/** HP bar that drops instantly on damage while a lighter chip bar catches up, and glows on heal. */
export function HealthBar({
  value,
  max = 100,
  color = "#ff784f",
  chipColor = "#ffc24a",
  healColor = "#6ee09a",
  showNumbers = true,
  label = "HP",
  className = "",
}: HealthBarProps) {
  const reduce = useReducedMotion();
  const [scope, animate] = useAnimate();
  const top = Math.max(1, max);
  const hp = Math.round(Math.min(top, Math.max(0, value)));
  const pct = (hp / top) * 100;

  // Compare with the previous value during render to know whether this change is a hit or a heal.
  const [prev, setPrev] = useState(hp);
  const [change, setChange] = useState<Change | null>(null);
  if (hp !== prev) {
    setPrev(hp);
    setChange({ n: (change?.n ?? 0) + 1, kind: hp < prev ? "damage" : "heal", delta: hp - prev });
  }

  const damage = change?.kind === "damage";
  const heal = change?.kind === "heal";
  const low = pct <= 25 && hp > 0;

  useEffect(() => {
    if (!change || change.kind !== "damage" || reduce || !scope.current) return;
    animate(scope.current, { x: [0, -5, 5, -3, 3, 0] }, { duration: 0.32, ease: "easeOut" });
  }, [change, reduce, animate, scope]);

  return (
    <div className={`w-full ${className}`}>
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="font-pixel text-xs uppercase tracking-wide" style={{ color }}>
          {label}
        </span>
        {showNumbers ? (
          <span className="font-pixel text-xs tabular-nums text-bone">
            {hp === 0 ? <span style={{ color }}>KO</span> : hp}
            <span className="text-bone-dim"> / {top}</span>
          </span>
        ) : null}
      </div>

      <div className="relative">
        <div
          ref={scope}
          className="relative h-4 overflow-hidden rounded-[4px] bg-ink-800 ring-1 ring-inset ring-white/10"
          role="progressbar"
          aria-label={label}
          aria-valuemin={0}
          aria-valuemax={top}
          aria-valuenow={hp}
          aria-valuetext={`${hp} of ${top}`}
        >
          {/* Chip: holds the old value for a beat after a hit, then drains down. */}
          <motion.div
            className="absolute inset-y-0 left-0"
            style={{ backgroundColor: chipColor }}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={damage ? { duration: 0.55, delay: 0.45, ease: [0.45, 0, 0.2, 1] } : { duration: 0 }}
          />
          {/* Heal preview: jumps to the new value while the main bar fills up to it. */}
          <motion.div
            className="absolute inset-y-0 left-0 opacity-60"
            style={{ backgroundColor: healColor }}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0 }}
          />
          <motion.div
            className="absolute inset-y-0 left-0 overflow-hidden"
            style={{ backgroundColor: color }}
            initial={false}
            animate={{ width: `${pct}%` }}
            transition={heal ? { duration: 0.6, delay: 0.15, ease: "easeOut" } : { duration: 0 }}
          >
            <span className="absolute inset-x-0 top-0 h-1/3 bg-white/25" />
            {low && !reduce ? (
              <motion.span
                className="absolute inset-0 bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.3, 0] }}
                transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : null}
          </motion.div>
          {/* Segment ticks every tenth of the bar. */}
          <span
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, transparent 0 calc(10% - 2px), rgb(7 6 6 / 0.55) calc(10% - 2px) 10%)",
            }}
          />
          {damage && !reduce ? (
            <motion.span
              key={change.n}
              className="pointer-events-none absolute inset-0 bg-white"
              initial={{ opacity: 0.8 }}
              animate={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            />
          ) : null}
        </div>

        {heal ? (
          <motion.span
            key={change.n}
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1 rounded-md"
            style={{ boxShadow: `0 0 18px 2px ${healColor}, inset 0 0 0 1px ${healColor}` }}
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.2 : 0.9, ease: "easeOut" }}
          />
        ) : null}

        {change && change.delta !== 0 ? (
          <motion.span
            key={`n${change.n}`}
            aria-hidden="true"
            className="pointer-events-none absolute -top-1 font-pixel text-sm tabular-nums"
            style={{ left: `${pct}%`, color: heal ? healColor : color, textShadow: "0 2px 0 #070606" }}
            initial={{ opacity: 0, y: 0, x: "-50%" }}
            animate={{ opacity: [0, 1, 1, 0], y: reduce ? 0 : -22, x: "-50%" }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          >
            {change.delta > 0 ? `+${change.delta}` : change.delta}
          </motion.span>
        ) : null}
      </div>
    </div>
  );
}
