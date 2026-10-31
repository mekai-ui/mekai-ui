"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

type XpBarProps = {
  xp: number;
  perLevel?: number;
  color?: string;
  className?: string;
};

const BURST = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);

export function XpBar({ xp, perLevel = 100, color = "#ffc24a", className = "" }: XpBarProps) {
  const level = Math.floor(xp / perLevel) + 1;
  const into = xp % perLevel;
  // Only celebrate levels gained after mount, not the starting level.
  const [startLevel] = useState(level);
  const leveledUp = level > startLevel;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="relative grid size-11 shrink-0 place-items-center">
        <motion.div
          key={level}
          initial={leveledUp ? { scale: 1.7, rotate: -12 } : false}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 14 }}
          className="grid size-11 place-items-center rounded-md border-2 font-display text-lg font-extrabold tabular-nums"
          style={{ borderColor: color, color, backgroundColor: `${color}1a` }}
          aria-label={`Level ${level}`}
        >
          {level}
        </motion.div>
        <AnimatePresence>
          {leveledUp ? (
            <motion.div key={level} className="pointer-events-none absolute inset-0" aria-hidden="true">
              {BURST.map((angle, i) => (
                <motion.span
                  key={i}
                  className="absolute left-1/2 top-1/2 size-1.5"
                  style={{ backgroundColor: color }}
                  initial={{ x: -3, y: -3, opacity: 1 }}
                  animate={{ x: Math.cos(angle) * 34 - 3, y: Math.sin(angle) * 34 - 3, opacity: 0 }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              ))}
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>

      <div className="min-w-0 flex-1">
        <div
          className="h-3 overflow-hidden rounded-[3px] bg-white/8 ring-1 ring-inset ring-white/10"
          role="progressbar"
          aria-label={`Progress to level ${level + 1}`}
          aria-valuemin={0}
          aria-valuemax={perLevel}
          aria-valuenow={into}
        >
          <motion.div
            key={level}
            className="relative h-full"
            style={{ backgroundColor: color }}
            initial={{ width: 0 }}
            animate={{ width: `${(into / perLevel) * 100}%` }}
            transition={{ type: "spring", stiffness: 90, damping: 18, delay: 0.1 }}
          >
            <span className="absolute inset-y-0 right-0 w-1.5 bg-white/70" />
          </motion.div>
        </div>
        <p className="mt-1.5 flex justify-between text-xs tabular-nums text-bone-dim">
          <span>
            {into} / {perLevel} XP
          </span>
          <span>
            {perLevel - into} to level {level + 1}
          </span>
        </p>
      </div>
    </div>
  );
}
